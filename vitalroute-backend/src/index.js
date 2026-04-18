require('dotenv').config();
const express = require('express');
const cors = require('cors');

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

// Middleware
app.use(cors({ origin: 'http://localhost:5173' })); 
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/hospitals', hospitalsRoutes);
app.use('/api/suppliers', suppliersRoutes);
app.use('/api/requests', requestsRoutes);
app.use('/api/match', matchingRoutes);
app.use('/api/route', routingRoutes);
app.use('/api/crisis-command', crisisCommandRoutes);
app.use('/api/notifications', notificationsRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Start background workers
startPolling();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`VitalRoute Backend running on port ${PORT}`);
});
