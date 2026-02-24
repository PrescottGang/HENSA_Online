const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');

// POST /api/auth/login
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

    // Si c'est la première connexion, mettre à jour le flag
    if (user.premiere_connexion) {
      await db.execute('UPDATE utilisateur SET premiere_connexion = FALSE WHERE id = ?', [user.id]);
    }

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

module.exports = router;