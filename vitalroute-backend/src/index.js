require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

// Initialize Firebase
require('./config/firebase');

// Import routes
const authRoutes = require('./routes/auth');
const hospitalsRoutes = require('./routes/hospitals');
const suppliersRoutes = require('./routes/suppliers');
const requestsRoutes = require('./routes/requests');
const matchingRoutes = require('./routes/matching');
const routingRoutes = require('./routes/routing');
const crisisCommandRoutes = require('./routes/crisisCommand');
const notificationsRoutes = require('./routes/notifications');

// Background Jobs
const { startPolling } = require('./services/alertService');

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
// TWEAK: Allow both Vite (5173) and Create React App/Next.js (3000) defaults
const allowedOrigins = [
  'http://localhost:5173', 
  'http://localhost:3000', 
  process.env.ALLOWED_ORIGIN
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(morgan('combined')); 

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/hospitals',     hospitalsRoutes);
app.use('/api/suppliers',     suppliersRoutes);
app.use('/api/requests',      requestsRoutes);
app.use('/api/match',         matchingRoutes);
app.use('/api/route',         routingRoutes);
app.use('/api/crisis-command',crisisCommandRoutes);
app.use('/api/notifications', notificationsRoutes);

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({
  status: 'ok',
  timestamp: new Date().toISOString(),
  env: process.env.NODE_ENV || 'development'
}));

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message, err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
startPolling();
const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {   
  console.log(`VitalRoute running on port ${PORT}`);
});
