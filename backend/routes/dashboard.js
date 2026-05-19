// routes/dashboard.js
const express = require("express");
const router = express.Router();
const db = require("../db");

/**
 * GET /api/dashboard/stats
 * Retourne toutes les statistiques nécessaires pour le DashboardAdmin
 */
router.get("/stats", async (req, res) => {
  try {
    // ── 1. Compteurs principaux ──────────────────────────────────────
    const [[{ nb_etudiants }]] = await db.query(
      "SELECT COUNT(*) AS nb_etudiants FROM utilisateur WHERE role = 'ETUDIANT'"
    );
    const [[{ nb_enseignants }]] = await db.query(
      "SELECT COUNT(*) AS nb_enseignants FROM utilisateur WHERE role = 'ENSEIGNANT'"
    );
    const [[{ nb_filieres }]] = await db.query(
      "SELECT COUNT(*) AS nb_filieres FROM filiere"
    );
    const [[{ nb_cours }]] = await db.query(
      "SELECT COUNT(*) AS nb_cours FROM cours"
    );

    // ── 2. Répartition des étudiants par filière ────────────────────
    const [filieres] = await db.query(`
      SELECT
        f.nom   AS name,
        COUNT(e.id) AS value
      FROM filiere f
      LEFT JOIN classe   c ON c.filiere_id = f.id
      LEFT JOIN etudiant e ON e.classe_id  = c.id
      GROUP BY f.id, f.nom
      ORDER BY value DESC
    `);

    // ── 3. Évolution des inscriptions (6 derniers mois) ─────────────
    // Regroupe par mois les créations de comptes étudiants
    const [inscriptions] = await db.query(`
      SELECT
        DATE_FORMAT(u.created_at, '%b') AS mois,
        DATE_FORMAT(u.created_at, '%Y-%m') AS mois_key,
        COUNT(*) AS value
      FROM utilisateur u
      WHERE u.role = 'ETUDIANT'
        AND u.created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY mois_key, mois
      ORDER BY mois_key ASC
    `);

    // ── 4. Taux de réussite & moyenne générale ───────────────────────
    // (Si vous avez une table 'note', sinon null est renvoyé)
    let moyGenerale = null;
    let tauxReussite = null;
    try {
      const [[noteStats]] = await db.query(`
        SELECT
          ROUND(AVG(valeur), 1)                                          AS moy_generale,
          ROUND(SUM(valeur >= 10) / COUNT(*) * 100, 1)                   AS taux_reussite
        FROM note
      `);
      moyGenerale  = noteStats.moy_generale;
      tauxReussite = noteStats.taux_reussite;
    } catch (_) {
      // Table 'note' absente ou vide → on laisse null
    }

    res.json({
      etudiants:    nb_etudiants,
      enseignants:  nb_enseignants,
      filieres:     nb_filieres,
      cours:        nb_cours,
      moyGenerale,
      tauxReussite,
      filieres_repartition: filieres,
      inscriptions_evolution: inscriptions,
    });

  } catch (err) {
    console.error("Erreur GET /dashboard/stats:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;