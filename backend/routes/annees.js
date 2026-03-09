const express = require("express");
const router = express.Router();
const db = require("../db");

/* ================================
   GET - Récupérer toutes les années
================================ */
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM annee_academique ORDER BY date_debut DESC",
    );

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

/* ================================
   POST - Créer une année académique
================================ */
router.post("/", async (req, res) => {
  try {
    const { libelle, date_debut, date_fin } = req.body;

    if (!libelle || !date_debut || !date_fin) {
      return res.status(400).json({ message: "Tous les champs sont requis." });
    }

    const [existing] = await db.query(
      "SELECT * FROM annee_academique WHERE libelle = ?",
      [libelle],
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: "Cette année existe déjà." });
    }

    await db.query(
      "UPDATE annee_academique SET statut = 'TERMINEE' WHERE statut = 'ACTIVE'",
    );

    await db.query(
      "INSERT INTO annee_academique (libelle, date_debut, date_fin, statut) VALUES (?, ?, ?, 'ACTIVE')",
      [libelle, date_debut, date_fin],
    );

    res.status(201).json({ message: "Année académique créée avec succès." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// Route corrigée avec vérification d'existence
router.post('/:id/generer-classes', async (req, res) => {
    const anneeId = req.params.id;

    try {
        // 1. Vérifier si des classes existent déjà pour cette année
        const [existingClasses] = await db.query(
            "SELECT id FROM classe WHERE annee_academique_id = ? LIMIT 1", 
            [anneeId]
        );

        if (existingClasses.length > 0) {
            return res.status(400).json({ 
                error: "Les classes pour cette année ont déjà été générées." 
            });
        }

        // 2. Récupérer les infos de l'année
        const [annee] = await db.query("SELECT libelle FROM annee_academique WHERE id = ?", [anneeId]);
        if (!annee.length) return res.status(404).json({ error: "Année non trouvée" });
        const libelleAnnee = annee[0].libelle;

        // 3. Récupérer filières et niveaux
        const [filieres] = await db.query("SELECT id, nom FROM filiere");
        const [niveaux] = await db.query("SELECT id, nom FROM niveau");

        if (filieres.length === 0 || niveaux.length === 0) {
            return res.status(400).json({ error: "Filières ou niveaux manquants dans la base." });
        }

        // 4. Préparer les données
        const values = [];
        for (const f of filieres) {
            for (const n of niveaux) {
                const nomClasse = `${n.nom} ${f.nom} ${libelleAnnee}`;
                values.push([nomClasse, n.id, f.id, anneeId]);
            }
        }

        // 5. Insertion
        const query = "INSERT INTO classe (nom, niveau_id, filiere_id, annee_academique_id) VALUES ?";
        await db.query(query, [values]);

        res.json({ message: `${values.length} classes générées avec succès !` });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erreur serveur lors de la génération." });
    }
});
module.exports = router;
