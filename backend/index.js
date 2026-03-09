require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

// Configuration CORS
const corsOptions = {
  origin: ['http://localhost:3000', 'http://localhost:5173'], // Support pour React et Vite
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware de logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/annees', require('./routes/annees'));
app.use("/api/filieres", require("./routes/filiere"));


// Route de test
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Middleware de gestion d'erreurs
app.use((err, req, res, next) => {
  console.error('Erreur serveur:', err.stack);
  res.status(500).json({ 
    error: 'Une erreur est survenue sur le serveur',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Gestion des routes non trouvées
app.use((req, res) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
  console.log(`📝 Environnement: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API disponible: http://localhost:${PORT}/api`);
});