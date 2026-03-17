// routes/annees.js
const express = require("express");
const router  = express.Router();
const db      = require("../db");
const jwt     = require("jsonwebtoken");

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

// ══════════════════════════════════════════════════════════════
// ANNÉES ACADÉMIQUES
// ══════════════════════════════════════════════════════════════

router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM annee_academique ORDER BY date_debut DESC");
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/", authenticate, requireAdmin, async (req, res) => {
  const { libelle, date_debut, date_fin } = req.body;
  if (!libelle || !date_debut || !date_fin)
    return res.status(400).json({ error: "Tous les champs sont requis." });
  try {
    const [[existing]] = await db.query(
      "SELECT id FROM annee_academique WHERE libelle=?", [libelle]
    );
    if (existing) return res.status(400).json({ error: "Cette année existe déjà." });

    // Mettre les autres ACTIVE en TERMINEE
    await db.query("UPDATE annee_academique SET statut='TERMINEE' WHERE statut='ACTIVE'");
    await db.query(
      "INSERT INTO annee_academique (libelle,date_debut,date_fin,statut) VALUES (?,?,?,'ACTIVE')",
      [libelle, date_debut, date_fin]
    );
    res.status(201).json({ message: "Année créée avec succès." });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch("/:id/cloturer", authenticate, requireAdmin, async (req, res) => {
  try {
    await db.query("UPDATE annee_academique SET statut='TERMINEE' WHERE id=?", [req.params.id]);
    res.json({ message: "Année clôturée." });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete("/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    await db.query("DELETE FROM annee_academique WHERE id=?", [req.params.id]);
    res.json({ message: "Année supprimée." });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Générer les classes ──────────────────────────────────────
router.post("/:id/generer-classes", authenticate, requireAdmin, async (req, res) => {
  const anneeId = req.params.id;
  try {
    const [[existingClass]] = await db.query(
      "SELECT id FROM classe WHERE annee_academique_id=? LIMIT 1", [anneeId]
    );
    if (existingClass)
      return res.status(400).json({ error: "Les classes ont déjà été générées pour cette année." });

    const [[annee]] = await db.query("SELECT libelle FROM annee_academique WHERE id=?", [anneeId]);
    if (!annee) return res.status(404).json({ error: "Année non trouvée." });

    const [filieres] = await db.query("SELECT id, nom FROM filiere");
    const [niveaux]  = await db.query("SELECT id, nom FROM niveau");
    if (!filieres.length || !niveaux.length)
      return res.status(400).json({ error: "Filières ou niveaux manquants." });

    const values = filieres.flatMap(f =>
      niveaux.map(n => [`${n.nom} ${f.nom} ${annee.libelle}`, n.id, f.id, anneeId])
    );
    await db.query(
      "INSERT INTO classe (nom,niveau_id,filiere_id,annee_academique_id) VALUES ?", [values]
    );
    res.json({ message: `${values.length} classes générées avec succès !` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════════
// BILAN DE FIN D'ANNÉE
// ══════════════════════════════════════════════════════════════

// GET /annees/:id/bilan — calcul des moyennes annuelles par étudiant pour une classe
// ?classe_id=X (optionnel, sinon toutes les classes de l'année)
router.get("/:id/bilan", authenticate, requireAdmin, async (req, res) => {
  const anneeId  = req.params.id;
  const { classe_id } = req.query;
  try {
    // Récupérer les inscriptions de l'année avec infos étudiant + classe
    const w = ["i.annee_id = ?"];
    const p = [anneeId];
    if (classe_id) { w.push("i.classe_id = ?"); p.push(classe_id); }

    const [inscriptions] = await db.query(
      `SELECT i.id AS inscription_id, i.statut AS statut_actuel,
              u.id AS etudiant_id, u.prenom, u.nom, u.photo AS photo_profil,
              e.matricule,
              c.id AS classe_id, c.nom AS classe_nom,
              f.id AS filiere_id, f.nom AS filiere_nom,
              n.id AS niveau_id, n.nom AS niveau_nom, n.ordre AS niveau_ordre, n.cycle
       FROM inscription i
       JOIN utilisateur u ON u.id = i.etudiant_id
       JOIN etudiant    e ON e.id = i.etudiant_id
       JOIN classe      c ON c.id = i.classe_id
       JOIN filiere     f ON f.id = c.filiere_id
       JOIN niveau      n ON n.id = c.niveau_id
       WHERE ${w.join(" AND ")}
       ORDER BY c.nom, u.nom, u.prenom`,
      p
    );

    if (!inscriptions.length) return res.json([]);

    // Calculer la moyenne annuelle de chaque étudiant (sur toutes ses notes de l'année)
    const etudIds = [...new Set(inscriptions.map(i => i.etudiant_id))];
    const [notes] = await db.query(
      `SELECT n.etudiant_id,
              AVG(CASE WHEN n.cc IS NOT NULL AND n.ef IS NOT NULL
                       THEN ROUND(n.cc*0.4 + n.ef*0.6, 2)
                       WHEN n.cc IS NOT NULL THEN n.cc
                       WHEN n.ef IS NOT NULL THEN n.ef
                       ELSE NULL END) AS moyenne_annuelle,
              COUNT(n.id) AS nb_matieres,
              SUM(CASE WHEN n.cc IS NOT NULL OR n.ef IS NOT NULL THEN 1 ELSE 0 END) AS nb_notes
       FROM note n
       WHERE n.annee_id = ? AND n.etudiant_id IN (${etudIds.map(()=>"?").join(",")})
       GROUP BY n.etudiant_id`,
      [anneeId, ...etudIds]
    );

    const noteMap = {};
    notes.forEach(n => { noteMap[n.etudiant_id] = n; });

    // Vérifier s'il existe un niveau supérieur pour chaque étudiant
    const [niveaux] = await db.query("SELECT * FROM niveau ORDER BY ordre");
    const niveauByOrdre = {};
    niveaux.forEach(n => { niveauByOrdre[n.ordre] = n; });

    const result = inscriptions.map(i => {
      const stats    = noteMap[i.etudiant_id];
      const moyenne  = stats?.moyenne_annuelle != null ? Math.round(stats.moyenne_annuelle * 100) / 100 : null;
      const niveauSup = niveauByOrdre[i.niveau_ordre + 1] || null;
      return {
        ...i,
        moyenne_annuelle: moyenne,
        nb_matieres:      stats?.nb_matieres || 0,
        nb_notes:         stats?.nb_notes    || 0,
        peut_passer:      !!niveauSup,          // false si L3 (pas de niveau suivant)
        niveau_suivant:   niveauSup,
        suggestion:       moyenne === null ? null : moyenne >= 10 ? "ADMIS" : "REDOUBLANT",
      };
    });

    res.json(result);
  } catch (e) {
    console.error("GET /bilan:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// PATCH /annees/:id/bilan/statut — l'admin statue sur un ou plusieurs étudiants
// body: { decisions: [{ inscription_id, statut: 'ADMIS'|'REDOUBLANT' }] }
router.patch("/:id/bilan/statut", authenticate, requireAdmin, async (req, res) => {
  const { decisions } = req.body;
  if (!Array.isArray(decisions) || !decisions.length)
    return res.status(400).json({ error: "decisions[] requis." });
  try {
    for (const d of decisions) {
      if (!["ADMIS","REDOUBLANT"].includes(d.statut)) continue;
      await db.query(
        "UPDATE inscription SET statut=? WHERE id=?",
        [d.statut, d.inscription_id]
      );
    }
    res.json({ ok: true, count: decisions.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════════
// RÉINSCRIPTION — passage en classe supérieure
// ══════════════════════════════════════════════════════════════

// GET /annees/:id/reinscription/preview — aperçu avant exécution
// Retourne ce qui se passera pour chaque étudiant (admis → classe suivante, redoublant → même classe, L3 admis → diplômé)
router.get("/:id/reinscription/preview", authenticate, requireAdmin, async (req, res) => {
  const anneeId = req.params.id;
  try {
    // Année suivante (active)
    const [[anneeActuelle]] = await db.query(
      "SELECT * FROM annee_academique WHERE id=?", [anneeId]
    );
    if (!anneeActuelle) return res.status(404).json({ error: "Année non trouvée." });

    // Trouver ou suggérer l'année suivante
    const [[anneeSuivante]] = await db.query(
      "SELECT * FROM annee_academique WHERE id != ? ORDER BY date_debut DESC LIMIT 1",
      [anneeId]
    );

    // Toutes les inscriptions de cette année avec statut ADMIS ou REDOUBLANT
    const [inscriptions] = await db.query(
      `SELECT i.*,
              u.prenom, u.nom,
              e.matricule,
              c.filiere_id, c.niveau_id,
              f.nom AS filiere_nom,
              n.nom AS niveau_nom, n.ordre AS niveau_ordre, n.cycle
       FROM inscription i
       JOIN utilisateur u ON u.id = i.etudiant_id
       JOIN etudiant    e ON e.id = i.etudiant_id
       JOIN classe      c ON c.id = i.classe_id
       JOIN filiere     f ON f.id = c.filiere_id
       JOIN niveau      n ON n.id = c.niveau_id
       WHERE i.annee_id = ? AND i.statut IN ('ADMIS','REDOUBLANT')
       ORDER BY c.nom, u.nom`,
      [anneeId]
    );

    if (!inscriptions.length)
      return res.json({ inscriptions: [], annee_suivante: anneeSuivante, avertissement: "Aucun étudiant statué. Veuillez d'abord valider les bilans." });

    if (!anneeSuivante)
      return res.json({ inscriptions, annee_suivante: null, avertissement: "Aucune nouvelle année académique trouvée. Créez-en une d'abord." });

    // Récupérer tous les niveaux
    const [niveaux] = await db.query("SELECT * FROM niveau ORDER BY ordre");
    const niveauByOrdre = {};
    niveaux.forEach(n => { niveauByOrdre[n.ordre] = n; });

    // Récupérer les classes de l'année suivante
    const [classesNouvelles] = await db.query(
      "SELECT * FROM classe WHERE annee_academique_id=?", [anneeSuivante.id]
    );
    const classeMap = {}; // filiere_id_niveau_id → classe
    classesNouvelles.forEach(c => { classeMap[`${c.filiere_id}_${c.niveau_id}`] = c; });

    const preview = inscriptions.map(i => {
      let action, classe_destination = null, avertissement = null;

      if (i.statut === "REDOUBLANT") {
        // Même classe dans la nouvelle année
        const cible = classeMap[`${i.filiere_id}_${i.niveau_id}`];
        action = "REDOUBLANT";
        classe_destination = cible || null;
        if (!cible) avertissement = "Classe correspondante introuvable dans la nouvelle année";

      } else if (i.statut === "ADMIS") {
        const niveauSup = niveauByOrdre[i.niveau_ordre + 1];
        if (!niveauSup) {
          // L3 → diplômé
          action = "DIPLOME";
          classe_destination = null;
        } else {
          const cible = classeMap[`${i.filiere_id}_${niveauSup.id}`];
          action = "PASSAGE";
          classe_destination = cible || null;
          if (!cible) avertissement = `Classe ${niveauSup.nom} – ${i.filiere_nom} introuvable dans la nouvelle année`;
        }
      }

      return { ...i, action, classe_destination, avertissement };
    });

    res.json({
      annee_suivante:    anneeSuivante,
      annee_actuelle:    anneeActuelle,
      inscriptions:      preview,
      stats: {
        total:      preview.length,
        passages:   preview.filter(p=>p.action==="PASSAGE").length,
        redoublants:preview.filter(p=>p.action==="REDOUBLANT").length,
        diplomes:   preview.filter(p=>p.action==="DIPLOME").length,
        erreurs:    preview.filter(p=>p.avertissement).length,
      }
    });
  } catch (e) {
    console.error("preview:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /annees/:id/reinscription/executer — exécuter le passage en classe supérieure
router.post("/:id/reinscription/executer", authenticate, requireAdmin, async (req, res) => {
  const anneeId = req.params.id;
  try {
    // Re-calculer le preview pour exécuter
    const [[anneeSuivante]] = await db.query(
      "SELECT * FROM annee_academique WHERE id != ? ORDER BY date_debut DESC LIMIT 1",
      [anneeId]
    );
    if (!anneeSuivante)
      return res.status(400).json({ error: "Aucune nouvelle année académique. Créez-en une d'abord." });

    const [classesNouvelles] = await db.query(
      "SELECT * FROM classe WHERE annee_academique_id=?", [anneeSuivante.id]
    );
    if (!classesNouvelles.length)
      return res.status(400).json({ error: "Aucune classe dans la nouvelle année. Générez les classes d'abord." });

    const classeMap = {};
    classesNouvelles.forEach(c => { classeMap[`${c.filiere_id}_${c.niveau_id}`] = c; });

    const [niveaux] = await db.query("SELECT * FROM niveau ORDER BY ordre");
    const niveauByOrdre = {};
    niveaux.forEach(n => { niveauByOrdre[n.ordre] = n; });

    const [inscriptions] = await db.query(
      `SELECT i.*,
              c.filiere_id, c.niveau_id, n.ordre AS niveau_ordre
       FROM inscription i
       JOIN classe   c ON c.id = i.classe_id
       JOIN niveau   n ON n.id = c.niveau_id
       WHERE i.annee_id = ? AND i.statut IN ('ADMIS','REDOUBLANT')`,
      [anneeId]
    );

    const stats = { passages: 0, redoublants: 0, diplomes: 0, erreurs: [] };

    for (const i of inscriptions) {
      try {
        if (i.statut === "REDOUBLANT") {
          const cible = classeMap[`${i.filiere_id}_${i.niveau_id}`];
          if (!cible) { stats.erreurs.push(`Étudiant ${i.etudiant_id}: classe redoublant introuvable`); continue; }

          // Nouvelle inscription même classe
          await db.query(
            "INSERT IGNORE INTO inscription (etudiant_id,classe_id,annee_id,statut) VALUES (?,?,?,'INSCRIT')",
            [i.etudiant_id, cible.id, anneeSuivante.id]
          );
          // Mettre à jour classe_id dans etudiant
          await db.query("UPDATE etudiant SET classe_id=? WHERE id=?", [cible.id, i.etudiant_id]);
          stats.redoublants++;

        } else if (i.statut === "ADMIS") {
          const niveauSup = niveauByOrdre[i.niveau_ordre + 1];
          if (!niveauSup) {
            // Diplômé → on ne réinscrit pas, on archive
            stats.diplomes++;
            continue;
          }
          const cible = classeMap[`${i.filiere_id}_${niveauSup.id}`];
          if (!cible) { stats.erreurs.push(`Étudiant ${i.etudiant_id}: classe ${niveauSup.nom} introuvable`); continue; }

          // Nouvelle inscription classe supérieure
          await db.query(
            "INSERT IGNORE INTO inscription (etudiant_id,classe_id,annee_id,statut) VALUES (?,?,?,'INSCRIT')",
            [i.etudiant_id, cible.id, anneeSuivante.id]
          );
          // Mettre à jour classe_id dans etudiant
          await db.query("UPDATE etudiant SET classe_id=? WHERE id=?", [cible.id, i.etudiant_id]);
          stats.passages++;
        }
      } catch (err) {
        stats.erreurs.push(`Étudiant ${i.etudiant_id}: ${err.message}`);
      }
    }

    res.json({
      ok: true,
      message: `Réinscription terminée : ${stats.passages} passage(s), ${stats.redoublants} redoublant(s), ${stats.diplomes} diplômé(s).`,
      stats,
    });
  } catch (e) {
    console.error("executer:", e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;