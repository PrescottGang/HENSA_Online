// routes/messaging.js
const express = require("express");
const router  = express.Router();
const db      = require("../db");
const jwt     = require("jsonwebtoken");
const multer  = require("multer");
const path    = require("path");
const fs      = require("fs");

// ─── Upload images ────────────────────────────────────────────────────────────
const uploadDir = path.join(__dirname, "../uploads/messages");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename:    (req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    cb(null, `msg_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024, files: 5 }, // 20MB par fichier
  fileFilter: (req, file, cb) => {
    // ✅ Images + fichiers courants
    const allowedImages = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
    const allowedFiles  = [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".zip"];
    const ext = path.extname(file.originalname).toLowerCase();
    const isImage = allowedImages.includes(ext);
    const isFile  = allowedFiles.includes(ext);
    if (isImage || isFile) cb(null, true);
    else cb(new Error("Format non supporté"));
  },
});

// ─── Auth ─────────────────────────────────────────────────────────────────────
const authenticate = (req, res, next) => {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) return res.status(401).json({ error: "Token manquant." });
  try { req.user = jwt.verify(h.split(" ")[1], process.env.JWT_SECRET); next(); }
  catch { return res.status(401).json({ error: "Token invalide." }); }
};

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== "ADMIN") return res.status(403).json({ error: "Admin requis." });
  next();
};

// ─── Helper : enrichir une conversation ───────────────────────────────────────
// ✅ Cache du nom de colonne date pour éviter SHOW COLUMNS répété
let _msgDateCol = null;
const getMsgDateCol = async () => {
  if (_msgDateCol) return _msgDateCol;
  try {
    const [cols] = await db.query("SHOW COLUMNS FROM message");
    const names  = cols.map((c) => c.Field);
    _msgDateCol  = names.includes("created_at") ? "created_at"
                 : names.includes("date_envoi")  ? "date_envoi"
                 : names.includes("sent_at")      ? "sent_at"
                 : "id";
  } catch (e) { _msgDateCol = "created_at"; }
  return _msgDateCol;
};

const enrichConversation = async (conv, userId) => {
  if (!conv?.id) return { ...conv, membres: [], dernier_message: null, non_lus: 0 };
  const dateCol = await getMsgDateCol();
  // Membres
  const [membres] = await db.query(
    `SELECT u.id, u.prenom, u.nom, u.role, u.photo AS photo_profil
     FROM conversation_membre cm
     JOIN utilisateur u ON u.id = cm.user_id
     WHERE cm.conversation_id = ?`,
    [conv.id]
  );

  // Dernier message — détection automatique du nom de colonne date
  let lastMsg = null;
  try {
    // Essai avec created_at
    const [[row]] = await db.query(
      `SELECT m.contenu, m.${dateCol} AS created_at, u.prenom, u.nom
       FROM message m JOIN utilisateur u ON u.id = m.auteur_id
       WHERE m.conversation_id = ?
       ORDER BY m.${dateCol} DESC LIMIT 1`,
      [conv.id]
    );
    lastMsg = row;
  } catch (e) { /* pas de message */ }

  // Non lus — sécurisé si conversation_lecture est vide
  let non_lus = 0;
  try {
    const [[{ count }]] = await db.query(
      `SELECT COUNT(*) AS count FROM message m
       WHERE m.conversation_id = ?
         AND m.auteur_id != ?
         AND m.id > COALESCE(
           (SELECT dernier_lu_id FROM conversation_lecture
            WHERE conversation_id = ? AND user_id = ?), 0)`,  
      [conv.id, userId, conv.id, userId]
    );
    non_lus = count;
  } catch (e) { /* table vide ou inexistante */ }

  return { ...conv, membres, dernier_message: lastMsg || null, non_lus };
};

// ─── GET /conversations — liste des conversations de l'utilisateur ────────────
router.get("/conversations", authenticate, async (req, res) => {
  try {
    const [convs] = await db.query(
      `SELECT c.*, u.prenom AS createur_prenom, u.nom AS createur_nom,
              (SELECT MAX(m.id) FROM message m WHERE m.conversation_id = c.id) AS last_msg_id
       FROM conversation c
       JOIN conversation_membre cm ON cm.conversation_id = c.id AND cm.user_id = ?
       JOIN utilisateur u ON u.id = c.createur_id
       ORDER BY last_msg_id DESC, c.created_at DESC`,
      [req.user.id]
    );

    const enriched = await Promise.all(convs.map((c) => enrichConversation(c, req.user.id)));
    res.json(enriched);
  } catch (err) {
    console.error("Erreur GET /conversations — message:", err.message);
    console.error("Erreur GET /conversations — stack:", err.stack);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /conversations/:id/messages ─────────────────────────────────────────
router.get("/conversations/:id/messages", authenticate, async (req, res) => {
  const convId = parseInt(req.params.id);
  try {
    // Vérifier que l'utilisateur est membre
    const [[membre]] = await db.query(
      "SELECT id FROM conversation_membre WHERE conversation_id = ? AND user_id = ?",
      [convId, req.user.id]
    );
    if (!membre) return res.status(403).json({ error: "Non membre de cette conversation." });

    // ✅ Détection dynamique des colonnes disponibles
    const dateCol = await getMsgDateCol();

    // ✅ Vérifier si message_image existe et quelles colonnes elle a
    let hasMessageImage = false;
    let imgHasType      = false;
    let imgHasNom       = false;
    try {
      const [imgCols] = await db.query("SHOW COLUMNS FROM message_image");
      const imgColNames = imgCols.map((c) => c.Field);
      hasMessageImage = true;
      imgHasType      = imgColNames.includes("type_fichier");
      imgHasNom       = imgColNames.includes("nom_original");
    } catch (e) { /* table inexistante */ }

    const [messages] = await db.query(
      `SELECT m.*, m.${dateCol} AS created_at,
              u.prenom, u.nom, u.role AS auteur_role, u.photo AS photo_profil
       FROM message m
       JOIN utilisateur u ON u.id = m.auteur_id
       WHERE m.conversation_id = ?
       ORDER BY m.${dateCol} ASC
       LIMIT 100`,
      [convId]
    );

    // ✅ Charger les statuts de lecture pour chaque message
    if (messages.length > 0) {
      try {
        const [lectures] = await db.query(
          `SELECT user_id, dernier_lu_id FROM conversation_lecture WHERE conversation_id = ?`,
          [convId]
        );
        // Pour chaque message, read_by = liste des users dont dernier_lu_id >= message.id
        messages.forEach((msg) => {
          msg.read_by = lectures
            .filter((l) => l.user_id !== msg.auteur_id && l.dernier_lu_id >= msg.id)
            .map((l) => l.user_id);
        });
      } catch (e) {
        messages.forEach((m) => { m.read_by = []; });
      }
    }

    // Pièces jointes
    if (messages.length > 0 && hasMessageImage) {
      try {
        const msgIds = messages.map((m) => m.id);
        const selectCols = ["message_id", "url", imgHasNom ? "nom_original" : "''" , imgHasType ? "type_fichier" : "'image' AS type_fichier"].join(", ");
        const [attachments] = await db.query(
          `SELECT ${selectCols} FROM message_image WHERE message_id IN (${msgIds.map(() => "?").join(",")}) ORDER BY ordre`,
          msgIds
        );
        const imgMap  = {};
        const fileMap = {};
        attachments.forEach(({ message_id, url, nom_original, type_fichier }) => {
          if (type_fichier === "image") {
            if (!imgMap[message_id])  imgMap[message_id]  = [];
            imgMap[message_id].push(url);
          } else {
            if (!fileMap[message_id]) fileMap[message_id] = [];
            fileMap[message_id].push({ url, nom_original });
          }
        });
        messages.forEach((m) => { m.images = imgMap[m.id] || []; m.fichiers = fileMap[m.id] || []; });
      } catch (e) {
        messages.forEach((m) => { m.images = []; m.fichiers = []; });
      }
    } else {
      messages.forEach((m) => { m.images = []; m.fichiers = []; });
    }

    // Marquer comme lus
    const lastMsg = messages[messages.length - 1];
    if (lastMsg) {
      try {
        await db.query(
          `INSERT INTO conversation_lecture (conversation_id, user_id, dernier_lu_id)
           VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE dernier_lu_id = ?`,
          [convId, req.user.id, lastMsg.id, lastMsg.id]
        );
      } catch (e) { /* table lecture inexistante */ }
    }

    res.json(messages);
  } catch (err) {
    console.error("Erreur GET messages — message:", err.message);
    console.error("Erreur GET messages — query:", err.sql);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /conversations/privee — démarrer ou retrouver une conv privée ───────
router.post("/conversations/privee", authenticate, async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "userId requis." });

  try {
    // Chercher une conversation privée existante entre les deux
    const [[existing]] = await db.query(
      `SELECT c.id FROM conversation c
       JOIN conversation_membre cm1 ON cm1.conversation_id = c.id AND cm1.user_id = ?
       JOIN conversation_membre cm2 ON cm2.conversation_id = c.id AND cm2.user_id = ?
       WHERE c.type = 'prive'
       LIMIT 1`,
      [req.user.id, userId]
    );

    if (existing) {
      const conv = await enrichConversation({ id: existing.id, type: "prive" }, req.user.id);
      return res.json(conv);
    }

    // Créer une nouvelle conversation privée
    const [result] = await db.query(
      "INSERT INTO conversation (type, createur_id) VALUES ('prive', ?)",
      [req.user.id]
    );
    const convId = result.insertId;

    await db.query(
      "INSERT INTO conversation_membre (conversation_id, user_id) VALUES (?, ?), (?, ?)",
      [convId, req.user.id, convId, userId]
    );

    const [[conv]] = await db.query("SELECT * FROM conversation WHERE id = ?", [convId]);
    const enriched = await enrichConversation(conv, req.user.id);

    // Notifier l'autre utilisateur via socket
    const io = req.app.get("io");
    if (io) io.to(`user_${userId}`).emit("new_conversation", enriched);

    res.status(201).json(enriched);
  } catch (err) {
    console.error("Erreur POST conv privée:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /conversations/groupe — créer un groupe (ADMIN only) ────────────────
router.post("/conversations/groupe", authenticate, async (req, res) => { // ✅ tout le monde peut créer
  const { nom, membres = [] } = req.body;
  if (!nom?.trim()) return res.status(400).json({ error: "Nom du groupe requis." });

  try {
    const [result] = await db.query(
      "INSERT INTO conversation (type, nom, createur_id) VALUES ('groupe', ?, ?)",
      [nom.trim(), req.user.id]
    );
    const convId = result.insertId;

    // Ajouter l'admin + les membres
    const allMembers = [...new Set([req.user.id, ...membres])];
    const values = allMembers.map((id) => [convId, id]);
    await db.query("INSERT INTO conversation_membre (conversation_id, user_id) VALUES ?", [values]);

    const [[conv]] = await db.query("SELECT * FROM conversation WHERE id = ?", [convId]);
    const enriched = await enrichConversation(conv, req.user.id);

    // Notifier tous les membres
    const io = req.app.get("io");
    if (io) membres.forEach((id) => io.to(`user_${id}`).emit("new_conversation", enriched));

    res.status(201).json(enriched);
  } catch (err) {
    console.error("Erreur POST groupe:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /conversations/:id/messages — envoyer un message ───────────────────
router.post("/conversations/:id/messages", authenticate, upload.array("images", 5), async (req, res) => {
  const convId = parseInt(req.params.id);
  const { contenu } = req.body;
  const files = req.files || [];

  if (!contenu?.trim() && files.length === 0)
    return res.status(400).json({ error: "Contenu ou image requis." });

  try {
    // Vérifier que l'utilisateur est membre
    const [[membre]] = await db.query(
      "SELECT id FROM conversation_membre WHERE conversation_id = ? AND user_id = ?",
      [convId, req.user.id]
    );
    if (!membre) return res.status(403).json({ error: "Non membre." });

    // Insérer le message
    const [result] = await db.query(
      "INSERT INTO message (conversation_id, auteur_id, contenu) VALUES (?, ?, ?)",
      [convId, req.user.id, contenu?.trim() || null]
    );
    const msgId = result.insertId;

    // ✅ Insérer les fichiers (images + documents)
    if (files.length > 0) {
      const allowedImages = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
      const fileValues = files.map((f, i) => {
        const ext     = path.extname(f.originalname).toLowerCase();
        const isImage = allowedImages.includes(ext);
        return [msgId, `/uploads/messages/${f.filename}`, f.originalname, isImage ? "image" : "fichier", i];
      });
      await db.query(
        "INSERT INTO message_image (message_id, url, nom_original, type_fichier, ordre) VALUES ?",
        [fileValues]
      );
    }

    // Récupérer le message complet
    const dateCol2 = await getMsgDateCol();
    const [[msg]] = await db.query(
      `SELECT m.*, m.${dateCol2} AS created_at, u.prenom, u.nom, u.role AS auteur_role, u.photo AS photo_profil
       FROM message m JOIN utilisateur u ON u.id = m.auteur_id WHERE m.id = ?`,
      [msgId]
    );
    const [attachments] = await db.query(
      "SELECT url, nom_original, type_fichier FROM message_image WHERE message_id = ? ORDER BY ordre",
      [msgId]
    );
    msg.images    = attachments.filter((a) => a.type_fichier === "image").map((a) => a.url);
    msg.fichiers  = attachments.filter((a) => a.type_fichier === "fichier");

    // Marquer comme lu pour l'expéditeur
    await db.query(
      `INSERT INTO conversation_lecture (conversation_id, user_id, dernier_lu_id)
       VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE dernier_lu_id = ?`,
      [convId, req.user.id, msgId, msgId]
    );

    // Récupérer le nom de la conv pour la notification
    const [[convRow]] = await db.query("SELECT nom, type FROM conversation WHERE id = ?", [convId]);
    const conv_name   = convRow?.type === "groupe" ? convRow.nom : null;

    // ✅ Émettre en temps réel à tous les membres de la conversation
    const io = req.app.get("io");
    if (io) {
      io.to(`conv_${convId}`).emit("new_message", { convId, message: msg });

      // ✅ Notification personnelle pour chaque membre (badge navbar)
      const [[auteur]] = await db.query("SELECT prenom, nom FROM utilisateur WHERE id = ?", [req.user.id]);
      const [membres]  = await db.query(
        "SELECT user_id FROM conversation_membre WHERE conversation_id = ? AND user_id != ?",
        [convId, req.user.id]
      );
      const convName = conv_name || (membres.length === 1 ? `${auteur?.prenom ?? ""} ${auteur?.nom ?? ""}`.trim() : "Groupe");
      membres.forEach(({ user_id }) => {
        io.to(`user_${user_id}`).emit("new_notification", {
          id:         Date.now() + user_id,
          type:       "message",
          titre:      convName,
          message:    msg.contenu || "📎 Pièce jointe",
          lien:       "/messages",
          entite_id:  convId,
          lu:         false,
          created_at: msg.created_at,
        });
      });
    }

    res.status(201).json(msg);
  } catch (err) {
    console.error("Erreur POST message:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /conversations/:id/lu — marquer comme lu ───────────────────────────
router.post("/conversations/:id/lu", authenticate, async (req, res) => {
  const convId = parseInt(req.params.id);
  try {
    // Trouver le dernier message de cette conv
    const [[lastMsg]] = await db.query(
      "SELECT id FROM message WHERE conversation_id = ? ORDER BY id DESC LIMIT 1",
      [convId]
    );
    if (!lastMsg) return res.json({ ok: true });

    // Mettre à jour la lecture
    await db.query(
      `INSERT INTO conversation_lecture (conversation_id, user_id, dernier_lu_id)
       VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE dernier_lu_id = ?`,
      [convId, req.user.id, lastMsg.id, lastMsg.id]
    );

    // ✅ Notifier les autres membres via Socket.IO
    const io = req.app.get("io");
    if (io) io.to(`conv_${convId}`).emit("msg_read", {
      convId,
      userId:     req.user.id,
      lastReadId: lastMsg.id,
    });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /conversations/:convId/messages/:msgId ────────────────────────────
router.delete("/conversations/:convId/messages/:msgId", authenticate, async (req, res) => {
  try {
    const [rows] = await db.query("SELECT auteur_id FROM message WHERE id = ?", [req.params.msgId]);
    if (!rows.length) return res.status(404).json({ error: "Message introuvable." });
    if (rows[0].auteur_id !== req.user.id)
      return res.status(403).json({ error: "Non autorisé." });

    await db.query("DELETE FROM message WHERE id = ?", [req.params.msgId]);

    const io = req.app.get("io");
    if (io) io.to(`conv_${req.params.convId}`).emit("delete_message", {
      convId: parseInt(req.params.convId),
      msgId:  parseInt(req.params.msgId),
    });

    res.json({ message: "Message supprimé." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /utilisateurs — liste pour démarrer une conv ────────────────────────
router.get("/utilisateurs", authenticate, async (req, res) => {
  try {
    const [users] = await db.query(
      "SELECT id, prenom, nom, role, photo AS photo_profil FROM utilisateur WHERE id != ? ORDER BY prenom, nom",
      [req.user.id]
    );
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /conversations/:id/membres — ajouter un membre (admin) ──────────────
router.post("/conversations/:id/membres", authenticate, requireAdmin, async (req, res) => {
  const { userId } = req.body;
  try {
    await db.query(
      "INSERT IGNORE INTO conversation_membre (conversation_id, user_id) VALUES (?, ?)",
      [req.params.id, userId]
    );
    const io = req.app.get("io");
    const [[conv]] = await db.query("SELECT * FROM conversation WHERE id = ?", [req.params.id]);
    const enriched = await enrichConversation(conv, userId);
    if (io) io.to(`user_${userId}`).emit("new_conversation", enriched);
    res.json({ message: "Membre ajouté." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;