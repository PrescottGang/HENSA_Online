// routes/publications.js
const express = require("express");
const router  = express.Router();
const db      = require("../db");
const jwt     = require("jsonwebtoken");
const multer  = require("multer");
const path    = require("path");
const fs      = require("fs");
const { createNotification, createBulkNotifications } = require("./notifications");

// ─── Upload fichiers (multer) ─────────────────────────────────────────────────
const uploadDir = path.join(__dirname, "../uploads/publications");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename:    (req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const name = `pub_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 5 }, // 5MB par fichier, max 5
  fileFilter: (req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
    const ext = path.extname(file.originalname).toLowerCase();
    allowed.includes(ext) ? cb(null, true) : cb(new Error("Format non supporté"));
  },
});

// ─── Auth middleware ──────────────────────────────────────────────────────────
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer "))
    return res.status(401).json({ error: "Token manquant." });
  try {
    req.user = jwt.verify(authHeader.split(" ")[1], process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Token invalide." });
  }
};

// ─── Middleware : seuls ETUDIANT et ADMIN peuvent publier ────────────────────
const requirePublisher = (req, res, next) => {
  if (!["ETUDIANT", "ADMIN"].includes(req.user?.role))
    return res.status(403).json({ error: "Seuls les étudiants et l'administrateur peuvent publier." });
  next();
};

// ─── Helper : récupérer une publication enrichie avec ses images ──────────────
const getPublication = async (id, currentUserId = null) => {
  const [rows] = await db.query(
    `SELECT
       p.*,
       u.prenom, u.nom, u.role AS auteur_role,
       (SELECT COUNT(*) FROM like_publication l WHERE l.publication_id = p.id) AS nb_likes,
       (SELECT COUNT(*) FROM commentaire c WHERE c.publication_id = p.id)      AS nb_commentaires
       ${currentUserId ? ", (SELECT COUNT(*) FROM like_publication WHERE publication_id = p.id AND user_id = ?) AS liked_by_me" : ""}
     FROM publication p
     JOIN utilisateur u ON u.id = p.auteur_id
     WHERE p.id = ?`,
    currentUserId ? [currentUserId, id] : [id]
  );
  const pub = rows[0];
  if (!pub) return null;

  // Récupérer les images
  const [images] = await db.query(
    "SELECT url FROM publication_image WHERE publication_id = ? ORDER BY ordre ASC",
    [id]
  );
  pub.images      = images.map((i) => i.url);
  pub.liked_by_me = currentUserId ? Boolean(pub.liked_by_me) : false;
  return pub;
};

// ─── GET / — fil des publications ────────────────────────────────────────────
router.get("/", authenticate, async (req, res) => {
  try {
    const [publications] = await db.query(
      `SELECT
         p.*,
         u.prenom, u.nom, u.role AS auteur_role,
         (SELECT COUNT(*) FROM like_publication l WHERE l.publication_id = p.id) AS nb_likes,
         (SELECT COUNT(*) FROM commentaire c    WHERE c.publication_id = p.id)   AS nb_commentaires
       FROM publication p
       JOIN utilisateur u ON u.id = p.auteur_id
       ORDER BY p.created_at DESC
       LIMIT 50`
    );

    if (publications.length === 0) return res.json([]);

    // Likes de l'utilisateur connecté
    const pubIds = publications.map((p) => p.id);
    const [likes] = await db.query(
      `SELECT publication_id FROM like_publication WHERE user_id = ? AND publication_id IN (${pubIds.map(() => "?").join(",")})`,
      [req.user.id, ...pubIds]
    );
    const likedSet = new Set(likes.map((l) => l.publication_id));

    // Images de toutes les publications en une seule requête
    const [allImages] = await db.query(
      `SELECT publication_id, url FROM publication_image WHERE publication_id IN (${pubIds.map(() => "?").join(",")}) ORDER BY ordre ASC`,
      pubIds
    );
    const imagesMap = {};
    allImages.forEach(({ publication_id, url }) => {
      if (!imagesMap[publication_id]) imagesMap[publication_id] = [];
      imagesMap[publication_id].push(url);
    });

    publications.forEach((p) => {
      p.liked_by_me = likedSet.has(p.id);
      p.images      = imagesMap[p.id] || [];
    });

    res.json(publications);
  } catch (err) {
    console.error("Erreur GET /publications:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /:id/commentaires ────────────────────────────────────────────────────
router.get("/:id/commentaires", authenticate, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT c.*, u.prenom, u.nom, u.role AS auteur_role
       FROM commentaire c
       JOIN utilisateur u ON u.id = c.auteur_id
       WHERE c.publication_id = ?
       ORDER BY c.created_at ASC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST / — créer une publication ──────────────────────────────────────────
router.post("/", authenticate, requirePublisher, upload.array("images", 5), async (req, res) => {
  const { contenu } = req.body;
  if (!contenu?.trim())
    return res.status(400).json({ error: "Le contenu est requis." });

  try {
    // ✅ Récupérer prenom/nom depuis la DB (pas le JWT)
    const [[auteur]] = await db.query(
      "SELECT prenom, nom FROM utilisateur WHERE id = ?",
      [req.user.id]
    );
    if (!auteur) return res.status(404).json({ error: "Utilisateur introuvable." });

    // Insérer la publication
    const [result] = await db.query(
      "INSERT INTO publication (auteur_id, contenu) VALUES (?, ?)",
      [req.user.id, contenu.trim()]
    );
    const pubId = result.insertId;

    // ✅ Insérer les fichiers uploadés
    const files = req.files || [];
    if (files.length > 0) {
      const imageValues = files.map((f, i) => [pubId, `/uploads/publications/${f.filename}`, i]);
      await db.query(
        "INSERT INTO publication_image (publication_id, url, ordre) VALUES ?",
        [imageValues]
      );
    }

    const pub = await getPublication(pubId, req.user.id);
    const io  = req.app.get("io");

    if (io) io.emit("new_publication", pub);

    // Notifier tous les utilisateurs actifs sauf l'auteur
    const [users] = await db.query(
      "SELECT id FROM utilisateur WHERE statut = 'ACTIF' AND id != ?",
      [req.user.id]
    );
    await createBulkNotifications({
      db, io,
      userIds:       users.map((u) => u.id),
      type:          "publication",
      titre:         `${auteur.prenom} ${auteur.nom} a publié un nouveau post`,
      message:       contenu.trim().substring(0, 80),
      lien:          "/publications",
      entiteId:      pubId,
      excludeUserId: req.user.id,
    });

    res.status(201).json(pub);
  } catch (err) {
    console.error("Erreur POST /publications:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /:id ──────────────────────────────────────────────────────────────
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const [rows] = await db.query("SELECT auteur_id FROM publication WHERE id = ?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "Publication introuvable." });
    if (rows[0].auteur_id !== req.user.id && req.user.role !== "ADMIN")
      return res.status(403).json({ error: "Non autorisé." });

    await db.query("DELETE FROM publication WHERE id = ?", [req.params.id]);

    const io = req.app.get("io");
    if (io) io.emit("delete_publication", { id: parseInt(req.params.id) });

    res.json({ message: "Publication supprimée.", id: parseInt(req.params.id) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /:id/like ───────────────────────────────────────────────────────────
router.post("/:id/like", authenticate, async (req, res) => {
  const pubId  = parseInt(req.params.id);
  const userId = req.user.id;

  try {
    const [existing] = await db.query(
      "SELECT id FROM like_publication WHERE publication_id = ? AND user_id = ?",
      [pubId, userId]
    );

    let liked;
    if (existing.length > 0) {
      await db.query("DELETE FROM like_publication WHERE publication_id = ? AND user_id = ?", [pubId, userId]);
      liked = false;
    } else {
      await db.query("INSERT INTO like_publication (publication_id, user_id) VALUES (?, ?)", [pubId, userId]);
      liked = true;

      // ✅ Récupérer prenom/nom depuis la DB
      const [[liker]]  = await db.query("SELECT prenom, nom FROM utilisateur WHERE id = ?", [userId]);
      const [[pubRow]]  = await db.query("SELECT auteur_id FROM publication WHERE id = ?", [pubId]);

      if (pubRow && pubRow.auteur_id !== userId) {
        const io = req.app.get("io");
        await createNotification({
          db, io,
          userId:        pubRow.auteur_id,
          type:          "like",
          titre:         `${liker.prenom} ${liker.nom} a aimé votre publication`,
          lien:          "/publications",
          entiteId:      pubId,
          excludeUserId: userId,
        });
      }
    }

    const [[{ nb_likes }]] = await db.query(
      "SELECT COUNT(*) AS nb_likes FROM like_publication WHERE publication_id = ?",
      [pubId]
    );

    const io = req.app.get("io");
    if (io) io.emit("update_likes", { pubId, nb_likes, userId, liked });

    res.json({ liked, nb_likes });
  } catch (err) {
    console.error("Erreur like:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /:id/commentaires ───────────────────────────────────────────────────
router.post("/:id/commentaires", authenticate, async (req, res) => {
  const pubId = parseInt(req.params.id);
  const { contenu } = req.body;

  if (!contenu?.trim())
    return res.status(400).json({ error: "Le contenu est requis." });

  try {
    // ✅ Récupérer prenom/nom depuis la DB
    const [[auteur]] = await db.query(
      "SELECT prenom, nom FROM utilisateur WHERE id = ?",
      [req.user.id]
    );

    const [result] = await db.query(
      "INSERT INTO commentaire (publication_id, auteur_id, contenu) VALUES (?, ?, ?)",
      [pubId, req.user.id, contenu.trim()]
    );

    const [[comment]] = await db.query(
      `SELECT c.*, u.prenom, u.nom, u.role AS auteur_role
       FROM commentaire c
       JOIN utilisateur u ON u.id = c.auteur_id
       WHERE c.id = ?`,
      [result.insertId]
    );

    const io = req.app.get("io");
    if (io) io.emit("new_comment", { pubId, comment });

    // Notifier l'auteur de la publication
    const [[pubRow]] = await db.query("SELECT auteur_id FROM publication WHERE id = ?", [pubId]);
    if (pubRow && pubRow.auteur_id !== req.user.id) {
      await createNotification({
        db, io,
        userId:        pubRow.auteur_id,
        type:          "comment",
        titre:         `${auteur.prenom} ${auteur.nom} a commenté votre publication`,
        message:       contenu.trim().substring(0, 80),
        lien:          "/publications",
        entiteId:      pubId,
        excludeUserId: req.user.id,
      });
    }

    res.status(201).json(comment);
  } catch (err) {
    console.error("Erreur commentaire:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /:pubId/commentaires/:comId ──────────────────────────────────────
router.delete("/:pubId/commentaires/:comId", authenticate, async (req, res) => {
  try {
    const [rows] = await db.query("SELECT auteur_id FROM commentaire WHERE id = ?", [req.params.comId]);
    if (!rows.length) return res.status(404).json({ error: "Commentaire introuvable." });
    if (rows[0].auteur_id !== req.user.id && req.user.role !== "ADMIN")
      return res.status(403).json({ error: "Non autorisé." });

    await db.query("DELETE FROM commentaire WHERE id = ?", [req.params.comId]);

    const io = req.app.get("io");
    if (io) io.emit("delete_comment", { pubId: parseInt(req.params.pubId), comId: parseInt(req.params.comId) });

    res.json({ message: "Commentaire supprimé." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;