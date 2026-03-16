// routes/cours.js
const express = require("express");
const router  = express.Router();
const db      = require("../db");
const jwt     = require("jsonwebtoken");

// ─── Middleware Auth ──────────────────────────────────────────────────────────
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
const requireEnseignantOrAdmin = (req, res, next) => {
  if (!["ADMIN","ENSEIGNANT"].includes(req.user?.role))
    return res.status(403).json({ error: "Accès non autorisé." });
  next();
};

// ─── Helper : envoyer une notification ───────────────────────────────────────
async function sendNotif(db, io, { userId, type = "cours", titre, message, lien, entiteId }) {
  try {
    const [r] = await db.query(
      `INSERT INTO notification (user_id, type, titre, message, lien, entite_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, type, titre, message, lien, entiteId || null]
    );
    if (io) io.to(`user_${userId}`).emit("new_notification", {
      id: r.insertId, type, titre, message, lien,
      entite_id: entiteId, lu: false, created_at: new Date(),
    });
  } catch (e) { console.error("sendNotif error:", e.message); }
}

// ══════════════════════════════════════════════════════════════════════════════
// DONNÉES DE RÉFÉRENCE
// ══════════════════════════════════════════════════════════════════════════════

// GET /cours/salles
router.get("/salles", authenticate, async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM salle ORDER BY nom");
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/salles", authenticate, requireAdmin, async (req, res) => {
  const { nom, capacite } = req.body;
  if (!nom?.trim()) return res.status(400).json({ error: "Nom requis." });
  try {
    const [r] = await db.query("INSERT INTO salle (nom, capacite) VALUES (?,?)", [nom.trim(), capacite || null]);
    const [[row]] = await db.query("SELECT * FROM salle WHERE id=?", [r.insertId]);
    res.status(201).json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /cours/classes
router.get("/classes", authenticate, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT c.id, c.nom, c.filiere_id, c.niveau_id,
              f.nom AS filiere_nom, n.nom AS niveau_nom, n.ordre,
              aa.libelle AS annee_libelle, aa.id AS annee_id
       FROM classe c
       JOIN filiere f ON f.id = c.filiere_id
       JOIN niveau  n ON n.id = c.niveau_id
       JOIN annee_academique aa ON aa.id = c.annee_academique_id
       WHERE aa.statut = 'ACTIVE'
       ORDER BY f.nom, n.ordre`
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /cours/enseignants
router.get("/enseignants", authenticate, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT u.id, u.prenom, u.nom, u.photo AS photo_profil, e.specialite, e.grade
       FROM utilisateur u
       JOIN enseignant e ON e.id = u.id
       WHERE u.statut = 'ACTIF'
       ORDER BY u.nom, u.prenom`
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /cours/semestres?classe_id=X  → semestres liés au niveau de cette classe
router.get("/semestres", authenticate, async (req, res) => {
  const { classe_id } = req.query;
  try {
    let rows;
    if (classe_id) {
      [rows] = await db.query(
        `SELECT sm.* FROM semestre sm
         JOIN classe c ON c.niveau_id = sm.niveau_id
         WHERE c.id = ?
         ORDER BY sm.numero`,
        [classe_id]
      );
    } else {
      [rows] = await db.query("SELECT * FROM semestre ORDER BY numero");
    }
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /cours/matieres?classe_id=X&semestre_id=Y
router.get("/matieres", authenticate, async (req, res) => {
  const { classe_id, semestre_id } = req.query;
  try {
    let query = `
      SELECT m.id, m.nom, m.code, m.coefficient, m.volume_horaire,
             ue.intitule AS ue_nom, ue.id AS ue_id,
             sm.libelle AS semestre_libelle, sm.id AS semestre_id
      FROM matiere m
      JOIN ue       ON ue.id  = m.ue_id
      JOIN semestre sm ON sm.id = ue.semestre_id
      JOIN niveau   n  ON n.id  = sm.niveau_id
    `;
    const params = [];
    const where  = [];

    if (classe_id) {
      query += " JOIN classe c ON c.niveau_id = n.id AND c.filiere_id = ue.filiere_id";
      where.push("c.id = ?");
      params.push(classe_id);
    }
    if (semestre_id) { where.push("sm.id = ?"); params.push(semestre_id); }
    if (where.length) query += " WHERE " + where.join(" AND ");
    query += " ORDER BY sm.numero, ue.ordre, m.nom";

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /cours/cours-list?classe_id=X  → table cours (ancienne)
router.get("/cours-list", authenticate, async (req, res) => {
  const { classe_id } = req.query;
  try {
    const [rows] = await db.query(
      `SELECT * FROM cours ${classe_id ? "WHERE classe_id=?" : ""} ORDER BY nom`,
      classe_id ? [classe_id] : []
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// SEMAINES
// ══════════════════════════════════════════════════════════════════════════════

// GET /cours/semaines?semestre_id=X
router.get("/semaines", authenticate, async (req, res) => {
  const { semestre_id } = req.query;
  try {
    const where  = semestre_id ? "WHERE semestre_id=?" : "";
    const params = semestre_id ? [semestre_id] : [];
    const [rows] = await db.query(
      `SELECT sw.*, sm.libelle AS semestre_libelle
       FROM semaine sw
       JOIN semestre sm ON sm.id = sw.semestre_id
       ${where}
       ORDER BY sw.date_debut DESC`,
      params
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /cours/semaines
router.post("/semaines", authenticate, requireAdmin, async (req, res) => {
  const { date_debut, date_fin, semestre_id } = req.body;
  if (!date_debut || !date_fin || !semestre_id)
    return res.status(400).json({ error: "date_debut, date_fin, semestre_id requis." });
  try {
    const [r] = await db.query(
      "INSERT INTO semaine (date_debut, date_fin, semestre_id) VALUES (?,?,?)",
      [date_debut, date_fin, semestre_id]
    );
    const [[row]] = await db.query(
      `SELECT sw.*, sm.libelle AS semestre_libelle
       FROM semaine sw JOIN semestre sm ON sm.id = sw.semestre_id
       WHERE sw.id=?`,
      [r.insertId]
    );
    res.status(201).json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete("/semaines/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    await db.query("DELETE FROM seance  WHERE semaine_id=?", [req.params.id]);
    await db.query("DELETE FROM semaine WHERE id=?",         [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// SÉANCES (EMPLOI DU TEMPS)
// ══════════════════════════════════════════════════════════════════════════════

// GET /cours/seances?semaine_id=X [&classe_id=Y] [&enseignant_id=Z]
router.get("/seances", authenticate, async (req, res) => {
  const { semaine_id, enseignant_id, classe_id } = req.query;
  try {
    const where  = [];
    const params = [];

    if (semaine_id)    { where.push("s.semaine_id=?");    params.push(semaine_id); }
    if (enseignant_id) { where.push("s.enseignant_id=?"); params.push(enseignant_id); }
    if (classe_id)     { where.push("s.classe_id=?");     params.push(classe_id); }

    // Étudiant → sa classe seulement
    if (req.user.role === "ETUDIANT") {
      const [[etud]] = await db.query(
        "SELECT classe_id FROM etudiant WHERE id=?", [req.user.id]
      );
      if (etud) { where.push("s.classe_id=?"); params.push(etud.classe_id); }
    }
    // Enseignant → ses séances seulement
    if (req.user.role === "ENSEIGNANT") {
      where.push("s.enseignant_id=?");
      params.push(req.user.id);
    }

    const whereSQL = where.length ? "WHERE " + where.join(" AND ") : "";

    const [rows] = await db.query(
      `SELECT s.*,
              u.prenom AS enseignant_prenom, u.nom AS enseignant_nom,
              u.photo  AS enseignant_photo,
              sl.nom   AS salle_nom,      sl.capacite AS salle_capacite,
              cl.nom   AS classe_nom,
              co.nom   AS cours_nom,
              m.id     AS matiere_id,     m.nom AS matiere_nom,
              m.code   AS matiere_code,   m.coefficient,
              sm.id    AS semestre_id,    sm.libelle AS semestre_libelle,
              f.nom    AS filiere_nom
       FROM seance s
       JOIN utilisateur u  ON u.id  = s.enseignant_id
       JOIN salle       sl ON sl.id = s.salle_id
       JOIN classe      cl ON cl.id = s.classe_id
       JOIN cours       co ON co.id = s.cours_id
       JOIN filiere     f  ON f.id  = cl.filiere_id
       LEFT JOIN matiere m  ON m.id  = s.matiere_id
       JOIN semaine     sw ON sw.id  = s.semaine_id
       JOIN semestre    sm ON sm.id  = sw.semestre_id
       ${whereSQL}
       ORDER BY s.date ASC, s.heure_debut ASC`,
      params
    );
    res.json(rows);
  } catch (e) {
    console.error("GET /seances:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /cours/seances — programmer une séance (Admin)
router.post("/seances", authenticate, requireAdmin, async (req, res) => {
  const {
    date, heure_debut, heure_fin,
    semaine_id, cours_id, matiere_id,
    enseignant_id, salle_id, classe_id,
    type_cours = "CM"
  } = req.body;

  if (!date||!heure_debut||!heure_fin||!semaine_id||!cours_id||!enseignant_id||!salle_id||!classe_id)
    return res.status(400).json({ error: "Tous les champs obligatoires requis." });

  try {
    // Conflit salle
    const [cSalle] = await db.query(
      `SELECT id FROM seance
       WHERE salle_id=? AND date=? AND statut='PLANIFIEE'
         AND NOT (heure_fin <= ? OR heure_debut >= ?)`,
      [salle_id, date, heure_debut, heure_fin]
    );
    if (cSalle.length)
      return res.status(409).json({ error: "Conflit : cette salle est déjà occupée sur ce créneau." });

    // Conflit enseignant
    const [cEns] = await db.query(
      `SELECT id FROM seance
       WHERE enseignant_id=? AND date=? AND statut='PLANIFIEE'
         AND NOT (heure_fin <= ? OR heure_debut >= ?)`,
      [enseignant_id, date, heure_debut, heure_fin]
    );
    if (cEns.length)
      return res.status(409).json({ error: "Conflit : cet enseignant est déjà planifié sur ce créneau." });

    const [r] = await db.query(
      `INSERT INTO seance
         (date, heure_debut, heure_fin, semaine_id, cours_id, matiere_id,
          enseignant_id, salle_id, classe_id, type_cours)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [date, heure_debut, heure_fin, semaine_id, cours_id,
       matiere_id || null, enseignant_id, salle_id, classe_id, type_cours]
    );

    // Séance complète
    const [[seance]] = await db.query(
      `SELECT s.*,
              u.prenom AS enseignant_prenom, u.nom AS enseignant_nom,
              sl.nom AS salle_nom, cl.nom AS classe_nom,
              co.nom AS cours_nom, m.nom AS matiere_nom, m.code AS matiere_code
       FROM seance s
       JOIN utilisateur u ON u.id=s.enseignant_id
       JOIN salle sl ON sl.id=s.salle_id
       JOIN classe cl ON cl.id=s.classe_id
       JOIN cours  co ON co.id=s.cours_id
       LEFT JOIN matiere m ON m.id=s.matiere_id
       WHERE s.id=?`, [r.insertId]
    );

    // Notif enseignant
    const io = req.app.get("io");
    const dateLabel = new Date(date).toLocaleDateString("fr-FR", { weekday:"long", day:"numeric", month:"long" });
    await sendNotif(db, io, {
      userId:   enseignant_id,
      type:     "cours",
      titre:    `📅 Nouveau cours programmé`,
      message:  `${seance.matiere_nom || seance.cours_nom} — ${dateLabel} ${heure_debut.slice(0,5)}→${heure_fin.slice(0,5)} | ${seance.salle_nom} | ${seance.classe_nom}`,
      lien:     "/emploi-du-temps",
      entiteId: r.insertId,
    });

    res.status(201).json(seance);
  } catch (e) {
    console.error("POST /seances:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// PATCH /cours/seances/:id — modifier / annuler
router.patch("/seances/:id", authenticate, requireAdmin, async (req, res) => {
  const { statut, heure_debut, heure_fin, salle_id, enseignant_id, matiere_id, type_cours } = req.body;
  try {
    const fields = [], vals = [];
    if (statut)       { fields.push("statut=?");       vals.push(statut); }
    if (heure_debut)  { fields.push("heure_debut=?");  vals.push(heure_debut); }
    if (heure_fin)    { fields.push("heure_fin=?");    vals.push(heure_fin); }
    if (salle_id)     { fields.push("salle_id=?");     vals.push(salle_id); }
    if (enseignant_id){ fields.push("enseignant_id=?");vals.push(enseignant_id); }
    if (type_cours)   { fields.push("type_cours=?");   vals.push(type_cours); }
    if (matiere_id !== undefined) { fields.push("matiere_id=?"); vals.push(matiere_id); }
    if (!fields.length) return res.status(400).json({ error: "Aucun champ." });

    vals.push(req.params.id);
    await db.query(`UPDATE seance SET ${fields.join(",")} WHERE id=?`, vals);

    // Notif annulation
    if (statut === "ANNULEE") {
      const [[s]] = await db.query(
        `SELECT s.enseignant_id, s.date, s.heure_debut, co.nom AS cours_nom, m.nom AS matiere_nom
         FROM seance s
         JOIN cours co ON co.id=s.cours_id
         LEFT JOIN matiere m ON m.id=s.matiere_id
         WHERE s.id=?`, [req.params.id]
      );
      if (s) {
        const io = req.app.get("io");
        const label = new Date(s.date).toLocaleDateString("fr-FR");
        await sendNotif(db, io, {
          userId:   s.enseignant_id,
          type:     "cours",
          titre:    `❌ Cours annulé`,
          message:  `${s.matiere_nom||s.cours_nom} du ${label} à ${s.heure_debut.slice(0,5)} a été annulé.`,
          lien:     "/emploi-du-temps",
          entiteId: parseInt(req.params.id),
        });
      }
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /cours/seances/:id
router.delete("/seances/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    await db.query("DELETE FROM seance WHERE id=?", [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// MES MATIÈRES (enseignant) — matières qu'il dispense via ses séances
// ══════════════════════════════════════════════════════════════════════════════
router.get("/mes-matieres", authenticate, requireEnseignantOrAdmin, async (req, res) => {
  const ensId = req.user.role === "ENSEIGNANT" ? req.user.id : req.query.enseignant_id;
  try {
    const [rows] = await db.query(
      `SELECT DISTINCT
              m.id AS matiere_id, m.nom AS matiere_nom, m.code AS matiere_code,
              m.coefficient,
              cl.id AS classe_id,  cl.nom AS classe_nom,
              f.nom AS filiere_nom, n.nom  AS niveau_nom,
              sm.id AS semestre_id, sm.libelle AS semestre_libelle,
              aa.id AS annee_id,   aa.libelle  AS annee_libelle
       FROM seance s
       JOIN matiere  m  ON m.id  = s.matiere_id
       JOIN classe   cl ON cl.id = s.classe_id
       JOIN filiere  f  ON f.id  = cl.filiere_id
       JOIN niveau   n  ON n.id  = cl.niveau_id
       JOIN semaine  sw ON sw.id = s.semaine_id
       JOIN semestre sm ON sm.id = sw.semestre_id
       JOIN annee_academique aa ON aa.id = cl.annee_academique_id
       WHERE s.enseignant_id = ? AND s.matiere_id IS NOT NULL
       ORDER BY cl.nom, m.nom`,
      [ensId]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// NOTES
// ══════════════════════════════════════════════════════════════════════════════

// GET /cours/notes?matiere_id=X&classe_id=X&semestre_id=X
router.get("/notes", authenticate, requireEnseignantOrAdmin, async (req, res) => {
  const { matiere_id, classe_id, semestre_id } = req.query;
  if (!matiere_id||!classe_id||!semestre_id)
    return res.status(400).json({ error: "matiere_id, classe_id, semestre_id requis." });

  try {
    // Année active
    const [[aa]] = await db.query(
      "SELECT id FROM annee_academique WHERE statut='ACTIVE' LIMIT 1"
    );
    const anneeId = aa?.id;
    if (!anneeId) return res.status(400).json({ error: "Aucune année académique active." });

    // Étudiants de la classe
    const [etudiants] = await db.query(
      `SELECT u.id, u.prenom, u.nom, u.photo AS photo_profil, e.matricule
       FROM utilisateur u
       JOIN etudiant e ON e.id = u.id
       WHERE e.classe_id = ?
       ORDER BY u.nom, u.prenom`,
      [classe_id]
    );

    if (!etudiants.length) return res.json({ etudiants: [], annee_id: anneeId });

    // Notes existantes
    const [notes] = await db.query(
      `SELECT * FROM note
       WHERE matiere_id=? AND semestre_id=? AND annee_id=?
         AND etudiant_id IN (${etudiants.map(()=>"?").join(",")})`,
      [matiere_id, semestre_id, anneeId, ...etudiants.map(e=>e.id)]
    );

    const noteMap = {};
    notes.forEach(n => { noteMap[n.etudiant_id] = n; });

    const result = etudiants.map(e => ({
      ...e,
      note_id: noteMap[e.id]?.id    ?? null,
      cc:      noteMap[e.id]?.cc    ?? null,
      ef:      noteMap[e.id]?.ef    ?? null,
      // Calcul JS (40% CC + 60% EF)
      moyenne: noteMap[e.id]?.cc != null && noteMap[e.id]?.ef != null
               ? Math.round((noteMap[e.id].cc * 0.4 + noteMap[e.id].ef * 0.6) * 100) / 100
               : null,
    }));

    res.json({ etudiants: result, annee_id: anneeId });
  } catch (e) {
    console.error("GET /notes:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /cours/notes — enregistrer/mettre à jour les notes en bulk
router.post("/notes", authenticate, requireEnseignantOrAdmin, async (req, res) => {
  const { notes } = req.body;
  if (!Array.isArray(notes)||!notes.length)
    return res.status(400).json({ error: "notes[] requis." });

  try {
    for (const n of notes) {
      const { etudiant_id, matiere_id, semestre_id, annee_id, cc, ef } = n;
      if (!etudiant_id||!matiere_id||!semestre_id||!annee_id) continue;
      await db.query(
        `INSERT INTO note (etudiant_id, matiere_id, semestre_id, annee_id, cc, ef)
         VALUES (?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE
           cc = CASE WHEN VALUES(cc) IS NOT NULL THEN VALUES(cc) ELSE cc END,
           ef = CASE WHEN VALUES(ef) IS NOT NULL THEN VALUES(ef) ELSE ef END`,
        [etudiant_id, matiere_id, semestre_id, annee_id,
         cc ?? null, ef ?? null]
      );
    }
    res.json({ ok: true, count: notes.length });
  } catch (e) {
    console.error("POST /notes:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /cours/notes/etudiant — notes de l'étudiant connecté
router.get("/notes/etudiant", authenticate, async (req, res) => {
  const etudId = req.user.role === "ETUDIANT" ? req.user.id : req.query.etudiant_id;
  try {
    const [notes] = await db.query(
      `SELECT n.*,
              m.nom AS matiere_nom, m.code AS matiere_code, m.coefficient,
              ue.intitule AS ue_nom,
              sm.libelle  AS semestre_libelle, sm.numero,
              aa.libelle  AS annee_libelle,
              CASE WHEN n.cc IS NOT NULL AND n.ef IS NOT NULL
                   THEN ROUND(n.cc*0.4 + n.ef*0.6, 2)
                   ELSE NULL END AS moyenne
       FROM note n
       JOIN matiere  m  ON m.id  = n.matiere_id
       JOIN ue          ON ue.id = m.ue_id
       JOIN semestre sm  ON sm.id = n.semestre_id
       JOIN annee_academique aa ON aa.id = n.annee_id
       WHERE n.etudiant_id=?
       ORDER BY sm.numero, ue.ordre, m.nom`,
      [etudId]
    );
    res.json(notes);
  } catch (e) { res.status(500).json({ error: e.message }); }
});


// POST /cours/cours-list-create — créer un cours générique (utilisé par le frontend)
router.post("/cours-list-create", authenticate, requireAdmin, async (req, res) => {
  const { nom, classe_id, semestre_id } = req.body;
  if (!nom || !classe_id || !semestre_id)
    return res.status(400).json({ error: "nom, classe_id, semestre_id requis." });
  try {
    const [r] = await db.query(
      "INSERT INTO cours (nom, classe_id, semestre_id) VALUES (?,?,?)",
      [nom, classe_id, semestre_id]
    );
    const [[row]] = await db.query("SELECT * FROM cours WHERE id=?", [r.insertId]);
    res.status(201).json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;