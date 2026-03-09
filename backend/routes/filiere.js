const express = require("express");
const router = express.Router();
const db = require("../db");

/* ===============================
   GET - Toutes les filières
================================ */
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM filiere ORDER BY nom ASC"
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

/* ===============================
   POST - Créer une filière
================================ */
router.post("/", async (req, res) => {
  try {
    const { nom } = req.body;

    if (!nom) {
      return res.status(400).json({ message: "Le nom est requis." });
    }

    const [existing] = await db.query(
      "SELECT id FROM filiere WHERE nom = ?",
      [nom]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: "Cette filière existe déjà." });
    }

    await db.query(
      "INSERT INTO filiere (nom) VALUES (?)",
      [nom]
    );

    res.status(201).json({ message: "Filière créée avec succès." });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

/* ===============================
   PUT - Modifier une filière
================================ */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nom } = req.body;

    if (!nom) {
      return res.status(400).json({ message: "Le nom est requis." });
    }

    await db.query(
      "UPDATE filiere SET nom = ? WHERE id = ?",
      [nom, id]
    );

    res.json({ message: "Filière modifiée avec succès." });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

/* ===============================
   DELETE - Supprimer une filière
================================ */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await db.query(
      "DELETE FROM filiere WHERE id = ?",
      [id]
    );

    res.json({ message: "Filière supprimée avec succès." });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

module.exports = router;