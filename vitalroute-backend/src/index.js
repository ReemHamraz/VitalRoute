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

// ── Middleware ────────────────────────────────────────────────────────────────

// Fix 1: Explicitly list allowed headers, don't use wildcard
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  optionsSuccessStatus: 204
}));

// Fix 2: Respond to ALL OPTIONS preflight requests immediately
app.options('*', cors());

app.use(express.json({ limit: '10mb' }));
app.use(morgan('combined'));

const rateLimit = require("express-rate-limit");
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use(limiter);

app.use((req, res, next) => {
  if (req.path === '/health') return next();

  // Fix 3: Never block OPTIONS — browser preflight won't carry x-api-key
  if (req.method === 'OPTIONS') return next();

  const key = req.headers['x-api-key'];
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