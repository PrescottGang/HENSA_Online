// routes/matieres.js
const express = require("express");
const router  = express.Router();
const db      = require("../db");
const jwt     = require("jsonwebtoken");

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

// ─── Helper : charger niveaux + semestres + UE + matières pour une filière ────
const loadFiliere = async (filiere_id) => {
  // 1. Tous les niveaux avec leurs semestres
  const [niveaux] = await db.query(
    `SELECT n.*, GROUP_CONCAT(s.id ORDER BY s.numero) AS sem_ids
     FROM niveau n
     LEFT JOIN semestre s ON s.niveau_id = n.id
     GROUP BY n.id
     ORDER BY n.ordre`,
    []
  );

  const [semestres] = await db.query(
    `SELECT s.*, n.nom AS niveau_nom, n.cycle
     FROM semestre s
     JOIN niveau n ON n.id = s.niveau_id
     ORDER BY s.numero`
  );

  // 2. UE de cette filière
  const [ues] = await db.query(
    `SELECT * FROM ue WHERE filiere_id = ? ORDER BY semestre_id, ordre`,
    [filiere_id]
  );

  // 3. Matières
  let matieres = [];
  if (ues.length > 0) {
    const ueIds = ues.map((u) => u.id);
    const [rows] = await db.query(
      `SELECT * FROM matiere WHERE ue_id IN (${ueIds.map(() => "?").join(",")}) ORDER BY nom`,
      ueIds
    );
    matieres = rows;
  }

  // Nester matieres → ues
  ues.forEach((ue) => { ue.matieres = matieres.filter((m) => m.ue_id === ue.id); });

  // Nester ues → semestres
  semestres.forEach((s) => { s.ues = ues.filter((u) => u.semestre_id === s.id); });

  // Nester semestres → niveaux
  niveaux.forEach((n) => { n.semestres = semestres.filter((s) => s.niveau_id === n.id); });

  return niveaux;
};

// ─── GET /data?filiere_id=X — arbre complet ───────────────────────────────────
router.get("/data", authenticate, async (req, res) => {
  const { filiere_id } = req.query;
  if (!filiere_id) return res.status(400).json({ error: "filiere_id requis." });
  try {
    res.json(await loadFiliere(filiere_id));
  } catch (err) {
    console.error("GET /matieres/data:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /filieres ────────────────────────────────────────────────────────────
router.get("/filieres", authenticate, async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM filiere ORDER BY nom");
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── GET /niveaux ─────────────────────────────────────────────────────────────
router.get("/niveaux", authenticate, async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM niveau ORDER BY ordre");
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================
// UE
// ============================================================

// POST /ue
router.post("/ue", authenticate, requireAdmin, async (req, res) => {
  const { filiere_id, semestre_id, code = "", intitule, credits = 0 } = req.body;
  if (!filiere_id || !semestre_id || !intitule?.trim())
    return res.status(400).json({ error: "filiere_id, semestre_id et intitule requis." });
  try {
    const [[{ max_ordre }]] = await db.query(
      "SELECT COALESCE(MAX(ordre),0) AS max_ordre FROM ue WHERE filiere_id = ? AND semestre_id = ?",
      [filiere_id, semestre_id]
    );
    const [r] = await db.query(
      "INSERT INTO ue (filiere_id, semestre_id, code, intitule, credits, ordre) VALUES (?,?,?,?,?,?)",
      [filiere_id, semestre_id, code.trim(), intitule.trim(), credits, max_ordre + 1]
    );
    const [[ue]] = await db.query("SELECT * FROM ue WHERE id = ?", [r.insertId]);
    ue.matieres = [];
    res.status(201).json(ue);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /ue/:id
router.put("/ue/:id", authenticate, requireAdmin, async (req, res) => {
  const { code = "", intitule, credits = 0 } = req.body;
  if (!intitule?.trim()) return res.status(400).json({ error: "intitule requis." });
  try {
    await db.query(
      "UPDATE ue SET code=?, intitule=?, credits=? WHERE id=?",
      [code.trim(), intitule.trim(), credits, req.params.id]
    );
    const [[ue]] = await db.query("SELECT * FROM ue WHERE id=?", [req.params.id]);
    res.json(ue);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /ue/:id
router.delete("/ue/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    await db.query("DELETE FROM ue WHERE id=?", [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================
// MATIÈRES
// ============================================================

// POST /matieres
router.post("/matieres", authenticate, requireAdmin, async (req, res) => {
  const { ue_id, code = "", nom, coefficient = 1, volume_horaire = 0 } = req.body;
  if (!ue_id || !nom?.trim())
    return res.status(400).json({ error: "ue_id et nom requis." });
  try {
    const [r] = await db.query(
      "INSERT INTO matiere (ue_id, code, nom, coefficient, volume_horaire) VALUES (?,?,?,?,?)",
      [ue_id, code.trim(), nom.trim(), coefficient, volume_horaire]
    );
    const [[m]] = await db.query("SELECT * FROM matiere WHERE id=?", [r.insertId]);
    res.status(201).json(m);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /matieres/:id
router.put("/matieres/:id", authenticate, requireAdmin, async (req, res) => {
  const { code = "", nom, coefficient = 1, volume_horaire = 0 } = req.body;
  if (!nom?.trim()) return res.status(400).json({ error: "nom requis." });
  try {
    await db.query(
      "UPDATE matiere SET code=?, nom=?, coefficient=?, volume_horaire=? WHERE id=?",
      [code.trim(), nom.trim(), coefficient, volume_horaire, req.params.id]
    );
    const [[m]] = await db.query("SELECT * FROM matiere WHERE id=?", [req.params.id]);
    res.json(m);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /matieres/:id
router.delete("/matieres/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    await db.query("DELETE FROM matiere WHERE id=?", [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;