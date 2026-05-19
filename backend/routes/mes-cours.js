// routes/mes-cours.js
// Accessible via GET /api/mes-cours
// Toutes les routes utilisent le même pattern authenticate + SEANCE_SELECT de cours.js

const express = require("express");
const router  = express.Router();
const db      = require("../db");
const jwt     = require("jsonwebtoken");

// ─── Auth (même pattern que cours.js) ────────────────────────────────────────
const authenticate = (req, res, next) => {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) return res.status(401).json({ error: "Token manquant." });
  try { req.user = jwt.verify(h.split(" ")[1], process.env.JWT_SECRET); next(); }
  catch { return res.status(401).json({ error: "Token invalide." }); }
};

const requireEnseignantOrAdmin = (req, res, next) => {
  if (!["ADMIN", "ENSEIGNANT"].includes(req.user?.role))
    return res.status(403).json({ error: "Accès non autorisé." });
  next();
};

// ─── SEANCE_SELECT (identique à cours.js) ────────────────────────────────────
const SEANCE_SELECT = `
  SELECT s.*,
         u.prenom AS enseignant_prenom, u.nom AS enseignant_nom, u.photo AS enseignant_photo,
         sl.nom   AS salle_nom,      sl.capacite AS salle_capacite,
         cl.id    AS classe_id,      cl.nom AS classe_nom,
         cl.filiere_id, cl.niveau_id,
         co.nom   AS cours_nom,
         m.id     AS matiere_id,  m.nom AS matiere_nom, m.code AS matiere_code, m.coefficient,
         sm.id    AS semestre_id, sm.libelle AS semestre_libelle,
         f.nom    AS filiere_nom, n.nom AS niveau_nom
  FROM seance s
  JOIN utilisateur u  ON u.id  = s.enseignant_id
  JOIN salle       sl ON sl.id = s.salle_id
  JOIN classe      cl ON cl.id = s.classe_id
  JOIN filiere     f  ON f.id  = cl.filiere_id
  JOIN niveau      n  ON n.id  = cl.niveau_id
  JOIN cours       co ON co.id = s.cours_id
  LEFT JOIN matiere m  ON m.id  = s.matiere_id
  JOIN semaine     sw ON sw.id  = s.semaine_id
  LEFT JOIN semestre sm ON sm.id = sw.semestre_id
`;

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/mes-cours/seances
// Toutes les séances de l'enseignant connecté
// Filtres optionnels : ?statut=  &matiere_id=  &classe_id=  &semestre_id=
// ══════════════════════════════════════════════════════════════════════════════
router.get("/seances", authenticate, requireEnseignantOrAdmin, async (req, res) => {
  // L'enseignant voit toujours ses propres séances ; un admin peut passer ?enseignant_id=X
  const ensId = req.user.role === "ENSEIGNANT"
    ? req.user.id
    : req.query.enseignant_id;

  if (!ensId) return res.status(400).json({ error: "enseignant_id requis." });

  const { statut, matiere_id, classe_id, semestre_id } = req.query;

  try {
    const w = ["s.enseignant_id = ?"];
    const p = [ensId];

    if (statut)      { w.push("s.statut = ?");     p.push(statut); }
    if (matiere_id)  { w.push("s.matiere_id = ?"); p.push(matiere_id); }
    if (classe_id)   { w.push("s.classe_id = ?");  p.push(classe_id); }
    if (semestre_id) { w.push("sm.id = ?");        p.push(semestre_id); }

    const [rows] = await db.query(
      `${SEANCE_SELECT} WHERE ${w.join(" AND ")} ORDER BY s.date DESC, s.heure_debut ASC`,
      p
    );
    res.json(rows);
  } catch (e) {
    console.error("GET /mes-cours/seances:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/mes-cours/matieres
// Matières distinctes enseignées (même requête que /cours/mes-matieres)
// ══════════════════════════════════════════════════════════════════════════════
router.get("/matieres", authenticate, requireEnseignantOrAdmin, async (req, res) => {
  const ensId = req.user.role === "ENSEIGNANT" ? req.user.id : req.query.enseignant_id;
  try {
    const [rows] = await db.query(
      `SELECT DISTINCT
              m.id AS matiere_id, m.nom AS matiere_nom, m.code AS matiere_code, m.coefficient,
              cl.id AS classe_id, cl.nom AS classe_nom,
              f.nom AS filiere_nom, nv.nom AS niveau_nom,
              sm.id AS semestre_id, sm.libelle AS semestre_libelle,
              aa.id AS annee_id,   aa.libelle AS annee_libelle
       FROM seance s
       JOIN matiere  m   ON m.id   = s.matiere_id
       JOIN ue           ON ue.id  = m.ue_id
       JOIN semestre sm  ON sm.id  = ue.semestre_id
       JOIN classe   cl  ON cl.id  = s.classe_id
       JOIN filiere  f   ON f.id   = cl.filiere_id
       JOIN niveau   nv  ON nv.id  = cl.niveau_id
       JOIN annee_academique aa ON aa.id = cl.annee_academique_id
       WHERE s.enseignant_id = ? AND s.matiere_id IS NOT NULL
       ORDER BY cl.nom, m.nom`,
      [ensId]
    );
    res.json(rows);
  } catch (e) {
    console.error("GET /mes-cours/matieres:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/mes-cours/stats
// KPIs de l'enseignant
// ══════════════════════════════════════════════════════════════════════════════
router.get("/stats", authenticate, requireEnseignantOrAdmin, async (req, res) => {
  const ensId = req.user.role === "ENSEIGNANT" ? req.user.id : req.query.enseignant_id;
  if (!ensId) return res.status(400).json({ error: "enseignant_id requis." });
  try {
    const [[totaux]] = await db.query(
      `SELECT
         COUNT(*)                                                      AS total_seances,
         SUM(s.statut = 'TERMINEE')                                   AS seances_terminees,
         SUM(s.statut = 'PLANIFIEE')                                  AS seances_planifiees,
         SUM(s.statut = 'ANNULEE')                                    AS seances_annulees,
         COUNT(DISTINCT s.matiere_id)                                 AS nb_matieres,
         COUNT(DISTINCT s.classe_id)                                  AS nb_classes,
         ROUND(
           SUM(TIMESTAMPDIFF(MINUTE, s.heure_debut, s.heure_fin)) / 60, 1
         )                                                             AS heures_total
       FROM seance s
       WHERE s.enseignant_id = ?`,
      [ensId]
    );
    res.json(totaux);
  } catch (e) {
    console.error("GET /mes-cours/stats:", e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;