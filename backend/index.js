const path = require('path');
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const http    = require('http');
const { Server } = require("socket.io");

const app    = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin:  ['http://localhost:3000', 'http://localhost:5173'],
    methods: ["GET", "POST"],
  },
});

app.set("io", io);

io.on("connection", (socket) => {
  console.log("🟢 Connecté:", socket.id);

  // Room par rôle (annonces collectives)
  socket.on("join", ({ role }) => {
    socket.join("ALL");
    if (role) socket.join(role);
    console.log(`👤 ${socket.id} → rooms: ALL + ${role}`);
  });

  // ✅ Room privée par utilisateur (notifications)
  socket.on("join_user", ({ userId }) => {
    if (userId) {
      socket.join(`user_${userId}`);
      console.log(`🔒 ${socket.id} → room privée: user_${userId}`);
    }
  });

  // ✅ Room de conversation (messagerie)
  socket.on("join_conv", ({ convId }) => {
    if (convId) {
      socket.join(`conv_${convId}`);
      console.log(`💬 ${socket.id} → room conv: conv_${convId}`);
    }
  });

  // ✅ Room par conversation (messagerie)
  socket.on("join_conv", ({ convId }) => {
    if (convId) {
      socket.join(`conv_${convId}`);
      console.log(`💬 ${socket.id} → conv_${convId}`);
    }
  });

  socket.on("leave_conv", ({ convId }) => {
    if (convId) socket.leave(`conv_${convId}`);
  });

  socket.on("disconnect", () => {
    console.log("🔴 Déconnecté:", socket.id);
  });
});

// CORS
const corsOptions = {
  origin:       ['http://localhost:3000', 'http://localhost:5173'],
  methods:      ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials:  true,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ✅ Servir les fichiers uploadés statiquement
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/users',         require('./routes/users'));
app.use('/api/annees',        require('./routes/annees'));
app.use('/api/filieres',      require('./routes/filiere'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/notifications', require('./routes/notifications').router);
app.use('/api/publications',  require('./routes/publications'));
app.use('/api/messaging',     require('./routes/messaging'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Gestion d'erreurs
app.use((err, req, res, next) => {
  console.error('Erreur serveur:', err.stack);
  res.status(500).json({
    error:   'Une erreur est survenue sur le serveur',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
  console.log(`📝 Environnement: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API disponible: http://localhost:${PORT}/api`);
  console.log(`🔌 Socket.IO actif`);
});