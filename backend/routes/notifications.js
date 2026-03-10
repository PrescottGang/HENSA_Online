// routes/notifications.js
const express = require("express");
const router  = express.Router();
const db      = require("../db");
const jwt     = require("jsonwebtoken");

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

// ─── Helper : créer UNE notification + émettre ───────────────────────────────
const createNotification = async ({ db, io, userId, type, titre, message, lien, entiteId, excludeUserId = null }) => {
  // ✅ Ne pas notifier l'auteur de l'action
  if (excludeUserId && userId === excludeUserId) return null;

  const [result] = await db.query(
    `INSERT INTO notification (user_id, type, titre, message, lien, entite_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, type, titre, message || null, lien || null, entiteId || null]
  );

  const [rows] = await db.query("SELECT * FROM notification WHERE id = ?", [result.insertId]);
  const notif  = rows[0];

  if (io) {
    io.to(`user_${userId}`).emit("new_notification", notif);
    console.log(`🔔 Notification émise → user_${userId} [${type}]`);
  }

  return notif;
};

// ─── Helper : créer des notifications EN MASSE + émettre ─────────────────────
const createBulkNotifications = async ({ db, io, userIds, type, titre, message, lien, entiteId, excludeUserId = null }) => {
  // ✅ Exclure l'auteur de l'action de la liste des destinataires
  const filteredIds = excludeUserId
    ? userIds.filter((id) => id !== excludeUserId)
    : userIds;

  if (!filteredIds || !filteredIds.length) return;

  // Remap pour utiliser la liste filtrée
  userIds = filteredIds;

  if (!userIds || !userIds.length) return;

  // Insérer toutes les notifications en une seule requête
  const values = userIds.map((id) => [id, type, titre, message || null, lien || null, entiteId || null]);
  await db.query(
    `INSERT INTO notification (user_id, type, titre, message, lien, entite_id) VALUES ?`,
    [values]
  );

  // ✅ Récupérer les notifications insérées avec leurs vrais IDs
  if (io && userIds.length > 0) {
    const placeholders = userIds.map(() => "?").join(",");
    const [inserted] = await db.query(
      `SELECT * FROM notification
       WHERE user_id IN (${placeholders})
         AND type = ?
         AND entite_id = ?
       ORDER BY id DESC
       LIMIT ?`,
      [...userIds, type, entiteId || null, userIds.length]
    );

    // Émettre à chaque utilisateur avec le vrai objet notification (vrai ID inclus)
    inserted.forEach((notif) => {
      io.to(`user_${notif.user_id}`).emit("new_notification", notif);
    });

    console.log(`🔔 ${inserted.length} notifications émises [${type}]`);
  }
};

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET — toutes les notifications de l'utilisateur
router.get("/", authenticate, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM notification
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error("Erreur GET /notifications:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ PATCH /lire-tout — AVANT /:id/lu pour éviter le conflit de route
router.patch("/lire-tout", authenticate, async (req, res) => {
  try {
    await db.query(
      "UPDATE notification SET lu = TRUE WHERE user_id = ?",
      [req.user.id]
    );
    res.json({ message: "Toutes les notifications marquées comme lues." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /:id/lu — marquer une seule notification comme lue
router.patch("/:id/lu", authenticate, async (req, res) => {
  try {
    await db.query(
      "UPDATE notification SET lu = TRUE WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.id]
    );
    res.json({ message: "Notification marquée comme lue." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE / — supprimer toutes les notifications
// ✅ AVANT /:id pour éviter le conflit de route
router.delete("/", authenticate, async (req, res) => {
  try {
    await db.query("DELETE FROM notification WHERE user_id = ?", [req.user.id]);
    res.json({ message: "Toutes les notifications supprimées." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /:id — supprimer une notification
router.delete("/:id", authenticate, async (req, res) => {
  try {
    await db.query(
      "DELETE FROM notification WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.id]
    );
    res.json({ message: "Notification supprimée." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { router, createNotification, createBulkNotifications };