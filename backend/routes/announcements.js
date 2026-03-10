// routes/announcements.js
const express = require("express");
const router  = express.Router();
const db      = require("../db");
const jwt     = require("jsonwebtoken");
const { createBulkNotifications } = require("./notifications");

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

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== "ADMIN")
    return res.status(403).json({ error: "Accès réservé à l'administrateur." });
  next();
};

// GET toutes les annonces
router.get("/", authenticate, async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM annonce ORDER BY created_at DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST nouvelle annonce — ADMIN uniquement
router.post("/", authenticate, requireAdmin, async (req, res) => {
  const { title, content, audience, priority } = req.body;

  if (!title || !content || !audience)
    return res.status(400).json({ error: "Titre, contenu et destinataires requis." });

  try {
    const [result] = await db.query(
      `INSERT INTO annonce (title, content, audience, priority, created_at) VALUES (?, ?, ?, ?, NOW())`,
      [title, content, audience, priority || "normal"]
    );

    const [rows] = await db.query("SELECT * FROM annonce WHERE id = ?", [result.insertId]);
    const newAnnouncement = rows[0];

    // Récupérer les utilisateurs concernés
    let roleFilter = "";
    if (audience === "Etudiants")   roleFilter = "AND role = 'ETUDIANT'";
    if (audience === "Enseignants") roleFilter = "AND role = 'ENSEIGNANT'";

    const [users] = await db.query(
      `SELECT id FROM utilisateur WHERE statut = 'ACTIF' ${roleFilter}`
    );

    const io = req.app.get("io");

    // ✅ Créer les notifications en base + émettre via Socket
    await createBulkNotifications({
      db,
      io,
      userIds:        users.map((u) => u.id),
      type:           "announcement",
      titre:          title,
      message:        content.substring(0, 100),
      lien:           "/annonces",
      entiteId:       newAnnouncement.id,
      excludeUserId:  req.user.id, // ✅ L'admin qui publie ne reçoit pas sa propre notif
    });

    // ✅ Émettre l'événement annonce pour mettre à jour toutes les listes
    if (io) {
      const rooms =
        audience === "Tous"      ? ["ALL"]      :
        audience === "Etudiants" ? ["ETUDIANT"] : ["ENSEIGNANT"];

      rooms.forEach((room) => io.to(room).emit("new_announcement", newAnnouncement));

      // ✅ Émettre aussi à l'admin qui a publié (pour MAJ immédiate de sa liste)
      io.to(`user_${req.user.id}`).emit("new_announcement", newAnnouncement);
      console.log(`📢 Émis dans rooms: ${rooms.join(", ")} + admin user_${req.user.id}`);
    }

    res.status(201).json({ message: "Annonce publiée.", announcement: newAnnouncement });

  } catch (err) {
    console.error("Erreur POST /announcements:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE annonce — ADMIN uniquement
router.delete("/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [result] = await db.query("DELETE FROM annonce WHERE id = ?", [id]);

    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Annonce non trouvée." });

    const io = req.app.get("io");
    if (io) io.emit("delete_announcement", { id });

    res.json({ message: "Annonce supprimée.", id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;