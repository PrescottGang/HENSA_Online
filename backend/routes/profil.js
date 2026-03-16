const express = require("express");
const router = express.Router();
const db = require("../db");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// 1. Middleware d'authentification interne
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: "Token manquant" });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Session expirée" });
    req.user = user;
    next();
  });
};

// 2. Configuration Multer (Photos de profil)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "..", "uploads", "profils");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `profil-${req.user.id}-${Date.now()}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// --- ROUTES ---

// GET /api/profil/ (Infos de base)
router.get("/", authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, nom, prenom, email, photo as photo_profil, role FROM utilisateur WHERE id = ?",
      [req.user.id]
    );
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Erreur serveur profil" });
  }
});

// GET /api/profil/publications (RÉPARÉ AVEC IMAGES)
router.get("/publications", authenticateToken, async (req, res) => {
  try {
    const [publications] = await db.query(
      `SELECT 
        p.id, 
        p.contenu, 
        p.created_at, 
        u.nom, 
        u.prenom, 
        u.photo AS photo_profil,
        (SELECT COUNT(*) FROM like_publication WHERE publication_id = p.id) AS likes_count,
        (SELECT COUNT(*) FROM commentaire WHERE publication_id = p.id) AS commentaires_count,
        (SELECT JSON_ARRAYAGG(user_id) FROM like_publication WHERE publication_id = p.id) AS likes_raw,
        (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', pi.id, 'url', pi.url)) 
         FROM publication_image pi WHERE pi.publication_id = p.id ORDER BY pi.ordre ASC) AS images
      FROM publication p
      JOIN utilisateur u ON p.auteur_id = u.id
      WHERE p.auteur_id = ?
      ORDER BY p.created_at DESC`,
      [req.user.id]
    );

    const formattedPubs = publications.map(p => {
      // Parsing sécurisé des likes
      let likesArray = [];
      try {
        const raw = typeof p.likes_raw === 'string' ? JSON.parse(p.likes_raw) : p.likes_raw;
        likesArray = Array.isArray(raw) ? raw.filter(id => id !== null) : [];
      } catch (e) { likesArray = []; }

      // Parsing sécurisé des images
      let imagesArray = [];
      try {
        imagesArray = typeof p.images === 'string' ? JSON.parse(p.images) : p.images;
        if (!Array.isArray(imagesArray)) imagesArray = [];
      } catch (e) { imagesArray = []; }

      return {
        ...p,
        likes: likesArray,
        images: imagesArray,
        likes_count: p.likes_count || 0,
        commentaires_count: p.commentaires_count || 0
      };
    });

    res.json(formattedPubs);
  } catch (error) {
    console.error("Détail Erreur SQL Publications:", error);
    res.status(500).json({ error: "Erreur lors du chargement des publications" });
  }
});

// PATCH /api/profil/ (Update Nom/Prénom + Realtime)
router.patch("/", authenticateToken, async (req, res) => {
  const { nom, prenom } = req.body;
  try {
    await db.query("UPDATE utilisateur SET nom = ?, prenom = ? WHERE id = ?", [nom, prenom, req.user.id]);
    
    const io = req.app.get('io');
    if (io) {
      // Émettre à tous pour mettre à jour les publications/commentaires affichés
      io.emit("userUpdated", { id: req.user.id, nom, prenom });
    }
    res.json({ success: true, nom, prenom });
  } catch (error) {
    res.status(500).json({ error: "Erreur mise à jour" });
  }
});

// PATCH /api/profil/photo (Update Photo + Realtime)
router.patch("/photo", authenticateToken, (req, res) => {
  upload.single("photo")(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "Aucun fichier" });

    try {
      const photoPath = `/uploads/profils/${req.file.filename}`;
      await db.query("UPDATE utilisateur SET photo = ? WHERE id = ?", [photoPath, req.user.id]);
      
      const io = req.app.get('io');
      if (io) {
        // Émettre à tous pour mettre à jour les avatars dans le feed
        io.emit("userUpdated", { id: req.user.id, photo_profil: photoPath });
      }
      res.json({ photo_profil: photoPath });
    } catch (error) {
      res.status(500).json({ error: "Erreur upload" });
    }
  });
});

module.exports = router;