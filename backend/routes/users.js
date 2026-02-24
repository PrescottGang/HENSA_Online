const express = require("express");
const router = express.Router();
const db = require("../db");
const bcrypt = require("bcrypt");

// =============================
// MIDDLEWARE DE VALIDATION
// =============================
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  return password && password.length >= 6;
};

// =============================
// ROUTE DE DEBUG
// =============================
router.get("/debug", async (req, res) => {
  try {
    const [test] = await db.query("SELECT 1 as test");
    const [classCount] = await db.query("SELECT COUNT(*) as count FROM classe");
    const [tables] = await db.query("SHOW TABLES");
    
    res.json({
      connected: true,
      tables: tables.map(t => Object.values(t)[0]),
      classCount: classCount[0].count,
      message: "Connexion DB OK"
    });
  } catch (err) {
    res.status(500).json({
      connected: false,
      error: err.message
    });
  }
});

// =============================
// GET CLASSES
// =============================
router.get("/classes", async (req, res) => {
  try {
    // Vérifier si la table semestre existe
    const [tables] = await db.query("SHOW TABLES LIKE 'semestre'");
    const semestreExists = tables.length > 0;
    
    let query;
    if (semestreExists) {
      query = `
        SELECT 
          c.id, 
          c.nom, 
          c.code, 
          c.semestre_id,
          s.nom AS semestre_nom,
          NULL AS annee_universitaire
        FROM classe c
        LEFT JOIN semestre s ON c.semestre_id = s.id
        ORDER BY c.nom ASC
      `;
    } else {
      query = `
        SELECT 
          id, 
          nom, 
          code, 
          semestre_id,
          NULL AS semestre_nom,
          NULL AS annee_universitaire
        FROM classe 
        ORDER BY nom ASC
      `;
    }
    
    const [rows] = await db.query(query);
    console.log(`📚 ${rows.length} classes chargées`);
    res.json(rows);
  } catch (err) {
    console.error("Erreur GET /classes:", err);
    res.status(500).json({ error: err.message });
  }
});

// =============================
// GET TOUS LES UTILISATEURS
// =============================
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        u.id,
        u.nom,
        u.prenom,
        u.email,
        u.statut,
        u.role,
        e.matricule,
        e.niveau,
        e.classe_id,
        c.nom AS classe_nom,
        en.specialite,
        en.grade
      FROM utilisateur u
      LEFT JOIN etudiant e ON u.id = e.id
      LEFT JOIN enseignant en ON u.id = en.id
      LEFT JOIN classe c ON e.classe_id = c.id
      ORDER BY u.id DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error("Erreur GET /:", err);
    res.status(500).json({ error: err.message });
  }
});

// =============================
// GET ETUDIANTS
// =============================
router.get("/etudiants", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        u.id,
        u.nom,
        u.prenom,
        u.email,
        u.statut,
        e.matricule,
        e.classe_id,
        c.id AS classe_id,
        c.nom AS classe_nom,
        c.code AS classe_code
      FROM etudiant e
      INNER JOIN utilisateur u ON e.id = u.id
      LEFT JOIN classe c ON e.classe_id = c.id
      WHERE u.role = 'ETUDIANT'
      ORDER BY u.nom ASC, u.prenom ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error("Erreur GET /etudiants:", err);
    res.status(500).json({ error: err.message });
  }
});

// =============================
// GET ENSEIGNANTS
// =============================
router.get("/enseignants", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        u.id,
        u.nom,
        u.prenom,
        u.email,
        u.statut,
        e.specialite,
        e.grade
      FROM enseignant e
      INNER JOIN utilisateur u ON e.id = u.id
      WHERE u.role = 'ENSEIGNANT'
      ORDER BY u.nom ASC, u.prenom ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error("Erreur GET /enseignants:", err);
    res.status(500).json({ error: err.message });
  }
});

// =============================
// GET UTILISATEUR PAR ID
// =============================
router.get("/:id", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        u.id,
        u.nom,
        u.prenom,
        u.email,
        u.statut,
        u.role,
        e.matricule,
        e.niveau,
        e.classe_id,
        c.nom AS classe_nom,
        en.specialite,
        en.grade
      FROM utilisateur u
      LEFT JOIN etudiant e ON u.id = e.id
      LEFT JOIN enseignant en ON u.id = en.id
      LEFT JOIN classe c ON e.classe_id = c.id
      WHERE u.id = ?
    `, [req.params.id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Erreur GET /:id:", err);
    res.status(500).json({ error: err.message });
  }
});

// =============================
// POST ETUDIANT
// =============================
router.post("/etudiants", async (req, res) => {
  const {
    nom,
    prenom,
    email,
    mot_de_passe,
    matricule,
    classe_id,
    niveau,
  } = req.body;

  // Validations
  const errors = [];
  if (!nom) errors.push("Le nom est requis");
  if (!prenom) errors.push("Le prénom est requis");
  if (!email) errors.push("L'email est requis");
  if (!validateEmail(email)) errors.push("Format d'email invalide");
  if (!mot_de_passe) errors.push("Le mot de passe est requis");
  if (!validatePassword(mot_de_passe)) errors.push("Le mot de passe doit contenir au moins 6 caractères");
  if (!matricule) errors.push("Le matricule est requis");
  if (!classe_id) errors.push("La classe est requise");
  if (!niveau) errors.push("Le niveau est requis");

  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(", ") });
  }

  const conn = await db.getConnection();
  await conn.beginTransaction();

  try {
    // Vérifier email unique
    const [existing] = await conn.query(
      "SELECT id FROM utilisateur WHERE email = ?",
      [email]
    );

    if (existing.length > 0) {
      throw new Error("Email déjà utilisé");
    }

    // Vérifier matricule unique
    const [existingMatricule] = await conn.query(
      "SELECT id FROM etudiant WHERE matricule = ?",
      [matricule]
    );

    if (existingMatricule.length > 0) {
      throw new Error("Matricule déjà utilisé");
    }

    const hashedPassword = await bcrypt.hash(mot_de_passe, 10);

    // Insert utilisateur
    const [userResult] = await conn.query(
      `INSERT INTO utilisateur 
      (nom, prenom, email, mot_de_passe, role, statut)
      VALUES (?, ?, ?, ?, 'ETUDIANT', 'ACTIF')`,
      [nom, prenom, email, hashedPassword]
    );

    const userId = userResult.insertId;

    // Insert etudiant
    await conn.query(
      `INSERT INTO etudiant (id, matricule, classe_id, niveau)
       VALUES (?, ?, ?, ?)`,
      [userId, matricule, classe_id, niveau]
    );

    await conn.commit();
    
    // Récupérer l'étudiant créé
    const [newStudent] = await conn.query(`
      SELECT 
        u.id, u.nom, u.prenom, u.email, u.statut,
        e.matricule, e.niveau, c.nom AS classe_nom
      FROM utilisateur u
      JOIN etudiant e ON u.id = e.id
      LEFT JOIN classe c ON e.classe_id = c.id
      WHERE u.id = ?
    `, [userId]);

    res.status(201).json({ 
      message: "Étudiant ajouté avec succès",
      student: newStudent[0]
    });

  } catch (err) {
    await conn.rollback();
    console.error("Erreur POST /etudiants:", err);
    res.status(400).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// =============================
// POST ENSEIGNANT
// =============================
router.post("/enseignants", async (req, res) => {
  const {
    nom,
    prenom,
    email,
    mot_de_passe,
    specialite,
    grade,
  } = req.body;

  // Validations
  const errors = [];
  if (!nom) errors.push("Le nom est requis");
  if (!prenom) errors.push("Le prénom est requis");
  if (!email) errors.push("L'email est requis");
  if (!validateEmail(email)) errors.push("Format d'email invalide");
  if (!mot_de_passe) errors.push("Le mot de passe est requis");
  if (!validatePassword(mot_de_passe)) errors.push("Le mot de passe doit contenir au moins 6 caractères");

  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(", ") });
  }

  const conn = await db.getConnection();
  await conn.beginTransaction();

  try {
    const [existing] = await conn.query(
      "SELECT id FROM utilisateur WHERE email = ?",
      [email]
    );

    if (existing.length > 0) {
      throw new Error("Email déjà utilisé");
    }

    const hashedPassword = await bcrypt.hash(mot_de_passe, 10);

    const [userResult] = await conn.query(
      `INSERT INTO utilisateur 
      (nom, prenom, email, mot_de_passe, role, statut)
      VALUES (?, ?, ?, ?, 'ENSEIGNANT', 'ACTIF')`,
      [nom, prenom, email, hashedPassword]
    );

    const userId = userResult.insertId;

    await conn.query(
      `INSERT INTO enseignant (id, specialite, grade)
       VALUES (?, ?, ?)`,
      [userId, specialite || null, grade || null]
    );

    await conn.commit();

    // Récupérer l'enseignant créé
    const [newTeacher] = await conn.query(`
      SELECT 
        u.id, u.nom, u.prenom, u.email, u.statut,
        e.specialite, e.grade
      FROM utilisateur u
      JOIN enseignant e ON u.id = e.id
      WHERE u.id = ?
    `, [userId]);

    res.status(201).json({ 
      message: "Enseignant ajouté avec succès",
      teacher: newTeacher[0]
    });

  } catch (err) {
    await conn.rollback();
    console.error("Erreur POST /enseignants:", err);
    res.status(400).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// =============================
// PATCH STATUT ETUDIANT
// =============================
router.patch("/etudiants/:id/statut", async (req, res) => {
  const { statut } = req.body;
  
  if (!statut || !['ACTIF', 'INACTIF'].includes(statut)) {
    return res.status(400).json({ error: "Statut invalide" });
  }

  try {
    const [result] = await db.query(
      "UPDATE utilisateur SET statut = ? WHERE id = ? AND role = 'ETUDIANT'",
      [statut, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Étudiant non trouvé" });
    }

    res.json({ 
      message: "Statut mis à jour avec succès",
      statut 
    });
  } catch (err) {
    console.error("Erreur PATCH /etudiants/:id/statut:", err);
    res.status(500).json({ error: err.message });
  }
});

// =============================
// PATCH STATUT ENSEIGNANT
// =============================
router.patch("/enseignants/:id/statut", async (req, res) => {
  const { statut } = req.body;
  
  if (!statut || !['ACTIF', 'INACTIF'].includes(statut)) {
    return res.status(400).json({ error: "Statut invalide" });
  }

  try {
    const [result] = await db.query(
      "UPDATE utilisateur SET statut = ? WHERE id = ? AND role = 'ENSEIGNANT'",
      [statut, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Enseignant non trouvé" });
    }

    res.json({ 
      message: "Statut mis à jour avec succès",
      statut 
    });
  } catch (err) {
    console.error("Erreur PATCH /enseignants/:id/statut:", err);
    res.status(500).json({ error: err.message });
  }
});

// =============================
// PUT ETUDIANT
// =============================
router.put("/etudiants/:id", async (req, res) => {
  const { nom, prenom, email, matricule, classe_id, niveau } = req.body;
  
  const errors = [];
  if (!nom) errors.push("Le nom est requis");
  if (!prenom) errors.push("Le prénom est requis");
  if (!email) errors.push("L'email est requis");
  if (!validateEmail(email)) errors.push("Format d'email invalide");
  if (!matricule) errors.push("Le matricule est requis");
  if (!classe_id) errors.push("La classe est requise");
  if (!niveau) errors.push("Le niveau est requis");

  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(", ") });
  }

  const conn = await db.getConnection();
  await conn.beginTransaction();

  try {
    // Vérifier si l'email existe déjà
    const [existing] = await conn.query(
      "SELECT id FROM utilisateur WHERE email = ? AND id != ?",
      [email, req.params.id]
    );

    if (existing.length > 0) {
      throw new Error("Email déjà utilisé par un autre utilisateur");
    }

    // Vérifier si le matricule existe déjà
    const [existingMatricule] = await conn.query(
      "SELECT id FROM etudiant WHERE matricule = ? AND id != ?",
      [matricule, req.params.id]
    );

    if (existingMatricule.length > 0) {
      throw new Error("Matricule déjà utilisé par un autre étudiant");
    }

    // Mettre à jour utilisateur
    await conn.query(
      "UPDATE utilisateur SET nom = ?, prenom = ?, email = ? WHERE id = ?",
      [nom, prenom, email, req.params.id]
    );

    // Mettre à jour étudiant
    await conn.query(
      "UPDATE etudiant SET matricule = ?, classe_id = ?, niveau = ? WHERE id = ?",
      [matricule, classe_id, niveau, req.params.id]
    );

    await conn.commit();
    res.json({ message: "Étudiant mis à jour avec succès" });
  } catch (err) {
    await conn.rollback();
    console.error("Erreur PUT /etudiants/:id:", err);
    res.status(400).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// =============================
// PUT ENSEIGNANT
// =============================
router.put("/enseignants/:id", async (req, res) => {
  const { nom, prenom, email, specialite, grade } = req.body;
  
  const errors = [];
  if (!nom) errors.push("Le nom est requis");
  if (!prenom) errors.push("Le prénom est requis");
  if (!email) errors.push("L'email est requis");
  if (!validateEmail(email)) errors.push("Format d'email invalide");

  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(", ") });
  }

  const conn = await db.getConnection();
  await conn.beginTransaction();

  try {
    const [existing] = await conn.query(
      "SELECT id FROM utilisateur WHERE email = ? AND id != ?",
      [email, req.params.id]
    );

    if (existing.length > 0) {
      throw new Error("Email déjà utilisé par un autre utilisateur");
    }

    await conn.query(
      "UPDATE utilisateur SET nom = ?, prenom = ?, email = ? WHERE id = ?",
      [nom, prenom, email, req.params.id]
    );

    await conn.query(
      "UPDATE enseignant SET specialite = ?, grade = ? WHERE id = ?",
      [specialite || null, grade || null, req.params.id]
    );

    await conn.commit();
    res.json({ message: "Enseignant mis à jour avec succès" });
  } catch (err) {
    await conn.rollback();
    console.error("Erreur PUT /enseignants/:id:", err);
    res.status(400).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// =============================
// DELETE ETUDIANT
// =============================
router.delete("/etudiants/:id", async (req, res) => {
  try {
    const [result] = await db.query(
      "DELETE FROM utilisateur WHERE id = ? AND role = 'ETUDIANT'",
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Étudiant non trouvé" });
    }

    res.json({ message: "Étudiant supprimé avec succès" });
  } catch (err) {
    console.error("Erreur DELETE /etudiants/:id:", err);
    res.status(500).json({ error: err.message });
  }
});

// =============================
// DELETE ENSEIGNANT
// =============================
router.delete("/enseignants/:id", async (req, res) => {
  try {
    const [result] = await db.query(
      "DELETE FROM utilisateur WHERE id = ? AND role = 'ENSEIGNANT'",
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Enseignant non trouvé" });
    }

    res.json({ message: "Enseignant supprimé avec succès" });
  } catch (err) {
    console.error("Erreur DELETE /enseignants/:id:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;