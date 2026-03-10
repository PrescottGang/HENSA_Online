const express = require("express");
const router = express.Router();
const db = require("../db");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

// =============================
// MAILER (réutilise la config de auth.js)
// =============================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// =============================
// GÉNÉRATEUR DE MOT DE PASSE
// =============================
const generatePassword = () => {
  // 10 caractères : lettres + chiffres + symboles simples
  return crypto.randomBytes(8).toString("base64").slice(0, 10).replace(/[^a-zA-Z0-9]/g, "x") + "!1";
};

// =============================
// ENVOI MAIL CREDENTIALS
// =============================
const sendCredentialsMail = async ({ to, prenom, nom, email, password, role, matricule }) => {
  const roleLabel = role === "ETUDIANT" ? "étudiant(e)" : "enseignant(e)";
  const extraInfo = matricule
    ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Matricule</td><td style="padding:8px 0;font-weight:600;">${matricule}</td></tr>`
    : "";

  await transporter.sendMail({
    from: `"Plateforme Académique" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Vos informations de connexion",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px;">
        
        <h2 style="color:#1e3a5f;margin-bottom:4px;">Bienvenue, ${prenom} ${nom} 👋</h2>
        <p style="color:#6b7280;margin-bottom:24px;">
          Votre compte <strong>${roleLabel}</strong> a été créé avec succès sur la plateforme académique.
          Voici vos informations de connexion :
        </p>

        <table style="width:100%;border-collapse:collapse;background:#f9fafb;border-radius:8px;padding:16px;" cellpadding="0" cellspacing="0">
          <tr style="border-bottom:1px solid #e5e7eb;">
            <td style="padding:12px 16px;color:#6b7280;font-size:14px;width:40%;">Adresse e-mail</td>
            <td style="padding:12px 16px;font-weight:600;color:#1e3a5f;">${email}</td>
          </tr>
          <tr style="border-bottom:1px solid #e5e7eb;">
            <td style="padding:12px 16px;color:#6b7280;font-size:14px;">Mot de passe</td>
            <td style="padding:12px 16px;">
              <span style="font-family:monospace;font-size:18px;font-weight:700;background:#e0e7ff;color:#1e3a5f;padding:6px 12px;border-radius:6px;letter-spacing:2px;">
                ${password}
              </span>
            </td>
          </tr>
          ${extraInfo}
        </table>

        <div style="margin-top:24px;padding:16px;background:#fef9c3;border-radius:8px;border-left:4px solid #f59e0b;">
          <p style="margin:0;color:#92400e;font-size:13px;">
            ⚠️ <strong>Important :</strong> Lors de votre première connexion, vous serez invité(e) à changer ce mot de passe temporaire.
          </p>
        </div>

        <p style="margin-top:24px;color:#9ca3af;font-size:12px;">
          Ne partagez jamais vos informations de connexion. Si vous n'êtes pas à l'origine de cette inscription, contactez l'administration.
        </p>
      </div>
    `,
  });
};

// =============================
// MIDDLEWARE DE VALIDATION
// =============================
const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

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
      tables: tables.map((t) => Object.values(t)[0]),
      classCount: classCount[0].count,
      message: "Connexion DB OK",
    });
  } catch (err) {
    res.status(500).json({ connected: false, error: err.message });
  }
});

// =============================
// GET CLASSES
// =============================
router.get("/classes", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        c.id,
        f.nom  AS filiere_nom,
        n.nom  AS niveau_nom,
        n.cycle,
        n.ordre
      FROM classe c
      INNER JOIN filiere f ON c.filiere_id = f.id
      INNER JOIN niveau  n ON c.niveau_id  = n.id
      ORDER BY f.nom ASC, n.ordre ASC
    `);
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
        u.id, u.nom, u.prenom, u.email, u.statut, u.role,
        e.matricule, e.niveau, e.classe_id,
        c.nom AS classe_nom,
        en.specialite, en.grade
      FROM utilisateur u
      LEFT JOIN etudiant e ON u.id = e.id
      LEFT JOIN enseignant en ON u.id = en.id
      LEFT JOIN classe c ON e.classe_id = c.id
      ORDER BY u.id DESC
    `);
    res.json(rows);
  } catch (err) {
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
        u.id, u.nom, u.prenom, u.email, u.statut,
        e.matricule, e.classe_id,
        f.nom AS filiere_nom,
        n.nom AS niveau_nom,
        n.cycle
      FROM etudiant e
      INNER JOIN utilisateur u ON e.id = u.id
      INNER JOIN classe      c ON e.classe_id = c.id
      INNER JOIN filiere     f ON c.filiere_id = f.id
      INNER JOIN niveau      n ON c.niveau_id  = n.id
      WHERE u.role = 'ETUDIANT'
      ORDER BY u.nom ASC, u.prenom ASC
    `);
    res.json(rows);
  } catch (err) {
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
        u.id, u.nom, u.prenom, u.email, u.statut,
        e.specialite, e.grade
      FROM enseignant e
      INNER JOIN utilisateur u ON e.id = u.id
      WHERE u.role = 'ENSEIGNANT'
      ORDER BY u.nom ASC, u.prenom ASC
    `);
    res.json(rows);
  } catch (err) {
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
        u.id, u.nom, u.prenom, u.email, u.statut, u.role,
        e.matricule, e.niveau, e.classe_id,
        c.nom AS classe_nom,
        en.specialite, en.grade
      FROM utilisateur u
      LEFT JOIN etudiant e ON u.id = e.id
      LEFT JOIN enseignant en ON u.id = en.id
      LEFT JOIN classe c ON e.classe_id = c.id
      WHERE u.id = ?
    `, [req.params.id]);

    if (rows.length === 0) return res.status(404).json({ error: "Utilisateur non trouvé" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =============================
// POST ETUDIANT
// =============================
router.post("/etudiants", async (req, res) => {
  const { nom, prenom, email, classe_id } = req.body;
  // ✅ mot_de_passe n'est plus requis depuis le frontend — généré automatiquement
  if (!nom || !prenom || !email || !classe_id) {
    return res.status(400).json({ error: "Tous les champs sont requis" });
  }
  if (!validateEmail(email)) {
    return res.status(400).json({ error: "Format d'email invalide" });
  }

  const conn = await db.getConnection();
  await conn.beginTransaction();

  try {
    // 1️⃣ Année académique active
    const [annee] = await conn.query(
      "SELECT id, libelle FROM annee_academique WHERE statut='ACTIVE' LIMIT 1"
    );
    if (!annee.length) throw new Error("Aucune année académique active trouvée");
    const anneeId = annee[0].id;
    const yearPart = annee[0].libelle.split("-")[0];

    // 2️⃣ Code filière
    const [classeInfo] = await conn.query(
      `SELECT f.nom AS code FROM classe c JOIN filiere f ON c.filiere_id = f.id WHERE c.id = ?`,
      [classe_id]
    );
    if (!classeInfo.length) throw new Error("Classe invalide");
    const filiereCode = classeInfo[0].code;

    // 3️⃣ Générer le matricule
    const [countResult] = await conn.query(
      "SELECT COUNT(*) as total FROM inscription WHERE annee_id = ?",
      [anneeId]
    );
    const numero = String(countResult[0].total + 1).padStart(4, "0");
    const matricule = `${yearPart}-${filiereCode}-${numero}`;

    // 4️⃣ Vérifier email unique
    const [existingEmail] = await conn.query(
      "SELECT id FROM utilisateur WHERE email = ?", [email]
    );
    if (existingEmail.length > 0) throw new Error("Email déjà utilisé");

    // 5️⃣ ✅ Générer le mot de passe automatiquement
    const plainPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // 6️⃣ Créer l'utilisateur
    const [userResult] = await conn.query(
      "INSERT INTO utilisateur (nom, prenom, email, mot_de_passe, role, statut, premiere_connexion) VALUES (?, ?, ?, ?, 'ETUDIANT', 'ACTIF', TRUE)",
      [nom, prenom, email, hashedPassword]
    );
    const userId = userResult.insertId;

    // 7️⃣ Créer l'entrée étudiant
    const [existingMat] = await conn.query(
      "SELECT id FROM etudiant WHERE matricule = ?", [matricule.toUpperCase()]
    );
    if (existingMat.length > 0) throw new Error("Ce matricule est déjà utilisé");

    await conn.query(
      "INSERT INTO etudiant (id, matricule, classe_id) VALUES (?, ?, ?)",
      [userId, matricule.toUpperCase(), classe_id]
    );

    // 8️⃣ Créer l'inscription
    await conn.query(
      "INSERT INTO inscription (etudiant_id, classe_id, annee_id, statut) VALUES (?, ?, ?, 'INSCRIT')",
      [userId, classe_id, anneeId]
    );

    await conn.commit();

    // 9️⃣ ✅ Envoyer les credentials par mail (après commit)
    try {
      await sendCredentialsMail({
        to: email,
        prenom,
        nom,
        email,
        password: plainPassword,
        role: "ETUDIANT",
        matricule: matricule.toUpperCase(),
      });
    } catch (mailErr) {
      // L'utilisateur est créé même si le mail échoue
      console.error("⚠️ Erreur envoi mail étudiant:", mailErr.message);
      return res.status(201).json({
        message: "Étudiant enregistré avec succès (⚠️ email non envoyé)",
        matricule,
        emailSent: false,
      });
    }

    res.status(201).json({
      message: "Étudiant enregistré et informations envoyées par email",
      matricule,
      emailSent: true,
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
  const { nom, prenom, email, specialite, grade } = req.body;
  // ✅ mot_de_passe n'est plus requis depuis le frontend

  const errors = [];
  if (!nom) errors.push("Le nom est requis");
  if (!prenom) errors.push("Le prénom est requis");
  if (!email) errors.push("L'email est requis");
  if (!validateEmail(email)) errors.push("Format d'email invalide");
  if (errors.length > 0) return res.status(400).json({ error: errors.join(", ") });

  const conn = await db.getConnection();
  await conn.beginTransaction();

  try {
    // Vérifier email unique
    const [existing] = await conn.query(
      "SELECT id FROM utilisateur WHERE email = ?", [email]
    );
    if (existing.length > 0) throw new Error("Email déjà utilisé");

    // ✅ Générer le mot de passe automatiquement
    const plainPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const [userResult] = await conn.query(
      `INSERT INTO utilisateur (nom, prenom, email, mot_de_passe, role, statut, premiere_connexion)
       VALUES (?, ?, ?, ?, 'ENSEIGNANT', 'ACTIF', TRUE)`,
      [nom, prenom, email, hashedPassword]
    );
    const userId = userResult.insertId;

    await conn.query(
      "INSERT INTO enseignant (id, specialite, grade) VALUES (?, ?, ?)",
      [userId, specialite || null, grade || null]
    );

    await conn.commit();

    // ✅ Envoyer les credentials par mail
    try {
      await sendCredentialsMail({
        to: email,
        prenom,
        nom,
        email,
        password: plainPassword,
        role: "ENSEIGNANT",
      });
    } catch (mailErr) {
      console.error("⚠️ Erreur envoi mail enseignant:", mailErr.message);
      return res.status(201).json({
        message: "Enseignant ajouté avec succès (⚠️ email non envoyé)",
        emailSent: false,
      });
    }

    res.status(201).json({
      message: "Enseignant ajouté et informations envoyées par email",
      emailSent: true,
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
  if (!statut || !["ACTIF", "INACTIF"].includes(statut)) {
    return res.status(400).json({ error: "Statut invalide" });
  }
  try {
    const [result] = await db.query(
      "UPDATE utilisateur SET statut = ? WHERE id = ? AND role = 'ETUDIANT'",
      [statut, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "Étudiant non trouvé" });
    res.json({ message: "Statut mis à jour avec succès", statut });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =============================
// PATCH STATUT ENSEIGNANT
// =============================
router.patch("/enseignants/:id/statut", async (req, res) => {
  const { statut } = req.body;
  if (!statut || !["ACTIF", "INACTIF"].includes(statut)) {
    return res.status(400).json({ error: "Statut invalide" });
  }
  try {
    const [result] = await db.query(
      "UPDATE utilisateur SET statut = ? WHERE id = ? AND role = 'ENSEIGNANT'",
      [statut, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "Enseignant non trouvé" });
    res.json({ message: "Statut mis à jour avec succès", statut });
  } catch (err) {
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
  if (!email || !validateEmail(email)) errors.push("Email invalide");
  if (!matricule) errors.push("Le matricule est requis");
  if (!classe_id) errors.push("La classe est requise");
  if (errors.length > 0) return res.status(400).json({ error: errors.join(", ") });

  const conn = await db.getConnection();
  await conn.beginTransaction();
  try {
    const [existingEmail] = await conn.query(
      "SELECT id FROM utilisateur WHERE email = ? AND id != ?", [email, req.params.id]
    );
    if (existingEmail.length > 0) throw new Error("Email déjà utilisé par un autre utilisateur");

    const [existingMat] = await conn.query(
      "SELECT id FROM etudiant WHERE matricule = ? AND id != ?", [matricule, req.params.id]
    );
    if (existingMat.length > 0) throw new Error("Matricule déjà utilisé par un autre étudiant");

    await conn.query(
      "UPDATE utilisateur SET nom = ?, prenom = ?, email = ? WHERE id = ?",
      [nom, prenom, email, req.params.id]
    );
    await conn.query(
      "UPDATE etudiant SET matricule = ?, classe_id = ?, niveau = ? WHERE id = ?",
      [matricule, classe_id, niveau || null, req.params.id]
    );
    await conn.commit();
    res.json({ message: "Étudiant mis à jour avec succès" });
  } catch (err) {
    await conn.rollback();
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
  if (!email || !validateEmail(email)) errors.push("Email invalide");
  if (errors.length > 0) return res.status(400).json({ error: errors.join(", ") });

  const conn = await db.getConnection();
  await conn.beginTransaction();
  try {
    const [existing] = await conn.query(
      "SELECT id FROM utilisateur WHERE email = ? AND id != ?", [email, req.params.id]
    );
    if (existing.length > 0) throw new Error("Email déjà utilisé par un autre utilisateur");

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
      "DELETE FROM utilisateur WHERE id = ? AND role = 'ETUDIANT'", [req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "Étudiant non trouvé" });
    res.json({ message: "Étudiant supprimé avec succès" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =============================
// DELETE ENSEIGNANT
// =============================
router.delete("/enseignants/:id", async (req, res) => {
  try {
    const [result] = await db.query(
      "DELETE FROM utilisateur WHERE id = ? AND role = 'ENSEIGNANT'", [req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "Enseignant non trouvé" });
    res.json({ message: "Enseignant supprimé avec succès" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;