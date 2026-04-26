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


const corsOptions = {
  origin: [
    'http://localhost:5173', 
    'http://localhost:5174', 
    'http://localhost:5175',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'https://vital-route.vercel.app' // 🌟 ADD THIS FOR CLOUD DEPLOYMENT!
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('combined')); 

const rateLimit = require("express-rate-limit");

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

app.use(limiter);

app.use((req, res, next) => {
  // Allow health check
  if (req.path === '/health') return next();

  const key = req.headers['x-api-key'];

  // If API_KEY is not set, skip protection (prevents crash)
  if (!process.env.API_KEY) return next();

  if (key !== process.env.API_KEY) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  next();
});

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
//startPolling();
const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {   
  console.log(`VitalRoute running on port ${PORT}`);
});
