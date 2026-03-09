const crypto = require('crypto');      
const nodemailer = require('nodemailer');
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');

// ✅ Transporter créé une seule fois, en dehors des routes
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,  // Doit être un "App Password" Gmail (pas votre vrai mot de passe)
  },
});

// ✅ Vérification de la connexion SMTP au démarrage
transporter.verify((error) => {
  if (error) {
    console.error('❌ Erreur SMTP :', error.message);
  } else {
    console.log('✅ Serveur mail prêt à envoyer des emails.');
  }
});


// ─── POST /api/auth/login ────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email et mot de passe requis.' });
  }

  try {
    const [rows] = await db.execute(
      'SELECT * FROM utilisateur WHERE email = ? AND statut = ?',
      [email, 'ACTIF']
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Identifiants incorrects ou compte inactif.' });
    }

    const user = rows[0];

    const isMatch = await bcrypt.compare(password, user.mot_de_passe);
    if (!isMatch) {
      return res.status(401).json({ message: 'Identifiants incorrects.' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        role: user.role,
        premiereConnexion: user.premiere_connexion,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});


// ─── POST /api/auth/change-password ─────────────────────────────────────────
router.post('/change-password', async (req, res) => {
  const { userId, nouveauMotDePasse } = req.body;

  if (!userId || !nouveauMotDePasse) {
    return res.status(400).json({ message: 'userId et nouveau mot de passe requis.' });
  }

  try {
    const hash = await bcrypt.hash(nouveauMotDePasse, 10);

    await db.execute(
      `UPDATE utilisateur SET mot_de_passe = ?, premiere_connexion = FALSE WHERE id = ?`,
      [hash, userId]
    );

    res.json({ message: 'Mot de passe modifié avec succès.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});


// ─── POST /api/auth/forgot-password ─────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  // ✅ Validation de l'email
  if (!email) {
    return res.status(400).json({ message: 'Email requis.' });
  }

  // ✅ Réponse générique pour éviter l'énumération d'emails
  const genericMessage = 'Si cet email existe, un code a été envoyé.';

  try {
    const [rows] = await db.execute(
      'SELECT * FROM utilisateur WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      return res.json({ message: genericMessage });
    }

    const user = rows[0];

    // Génération OTP 6 chiffres
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash OTP avant stockage
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    const expire = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await db.execute(
      `UPDATE utilisateur SET reset_otp = ?, reset_otp_expire = ? WHERE id = ?`,
      [hashedOtp, expire, user.id]
    );

    // ✅ Envoi du mail avec from obligatoire
    await transporter.sendMail({
      from: `"Support Plateforme" <${process.env.EMAIL_USER}>`,  // ✅ Champ from manquant dans l'original
      to: user.email,
      subject: 'Code de réinitialisation de mot de passe',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px;">
          <h2 style="color:#1e3a5f;margin-bottom:8px;">Réinitialisation du mot de passe</h2>
          <p style="color:#6b7280;margin-bottom:24px;">
            Utilisez ce code pour réinitialiser votre mot de passe. Il est valable <b>10 minutes</b>.
          </p>

          <div style="text-align:center;margin:24px 0;">
            <span style="
              font-size:36px;
              font-weight:bold;
              letter-spacing:12px;
              background:#f3f4f6;
              color:#1e3a5f;
              padding:16px 24px;
              display:inline-block;
              border-radius:8px;
              border:1px solid #e5e7eb;">
              ${otp}
            </span>
          </div>

          <p style="color:#9ca3af;font-size:13px;margin-top:24px;">
            Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.<br/>
            Ne partagez jamais ce code avec quelqu'un.
          </p>
        </div>
      `,
    });

    res.json({ message: genericMessage });

  } catch (err) {
    console.error('Erreur forgot-password :', err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});


// ─── POST /api/auth/reset-password ──────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  const { email, otp, password } = req.body;

  // ✅ Validation des champs
  if (!email || !otp || !password) {
    return res.status(400).json({ message: 'Email, code OTP et nouveau mot de passe requis.' });
  }

  try {
    const [rows] = await db.execute(
      'SELECT * FROM utilisateur WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: 'Code invalide.' });
    }

    const user = rows[0];

    // ✅ Vérification que l'OTP existe en base
    if (!user.reset_otp || !user.reset_otp_expire) {
      return res.status(400).json({ message: 'Aucune demande de réinitialisation en cours.' });
    }

    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    // ✅ Vérification OTP et expiration
    if (user.reset_otp !== hashedOtp) {
      return res.status(400).json({ message: 'Code invalide.' });
    }

    if (new Date(user.reset_otp_expire) < new Date()) {
      return res.status(400).json({ message: 'Code expiré. Veuillez faire une nouvelle demande.' });
    }

    const hash = await bcrypt.hash(password, 10);

    await db.execute(
      `UPDATE utilisateur
       SET mot_de_passe = ?, reset_otp = NULL, reset_otp_expire = NULL
       WHERE id = ?`,
      [hash, user.id]
    );

    res.json({ message: 'Mot de passe réinitialisé avec succès.' });

  } catch (err) {
    console.error('Erreur reset-password :', err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});


module.exports = router;