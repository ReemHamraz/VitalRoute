const express = require('express');
const jwt = require('jsonwebtoken');
const { auth, db } = require('../config/firebase');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// ── Helpers ───────────────────────────────────────────────────────────────────
const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  // FIX 1: Hard fail if JWT_SECRET is not set — 'secret' in prod is a critical vulnerability
  if (!secret || secret === 'secret') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set in production');
    }
    console.warn('[Auth] WARNING: Using default JWT secret. Set JWT_SECRET in .env');
    return 'vitalroute-dev-secret-change-me';
  }
  return secret;
};

// ── Register ──────────────────────────────────────────────────────────────────
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, role, hospitalId } = req.body;

    // FIX 2: Input validation
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'password must be at least 8 characters' });
    }
    if (!['hospital_admin', 'supplier', 'coordinator'].includes(role)) {
      return res.status(400).json({ error: 'role must be hospital_admin, supplier, or coordinator' });
    }
    if (role === 'hospital_admin' && !hospitalId) {
      return res.status(400).json({ error: 'hospitalId is required for hospital_admin role' });
    }

    const userRecord = await auth.createUser({ email, password });

    await db.collection('users').doc(userRecord.uid).set({
      email,
      role,
      hospitalId: hospitalId || null,
      createdAt: new Date(),
    });

    const token = jwt.sign(
      { uid: userRecord.uid, role, email, hospitalId: hospitalId || null },
      getJwtSecret(),
      { expiresIn: '7d' }
    );

    res.status(201).json({ token, user: { uid: userRecord.uid, email, role, hospitalId } });

  } catch (error) {
    // Firebase gives readable messages like "email already exists"
    res.status(400).json({ error: error.message });
  }
});

// ── Login ─────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const webApiKey = process.env.FIREBASE_WEB_API_KEY;
  if (!webApiKey) {
    return res.status(500).json({ error: 'Server misconfiguration: FIREBASE_WEB_API_KEY missing' });
  }

  try {
    // Verify password via Firebase Auth REST API
    const verifyUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${webApiKey}`;
    const authResponse = await fetch(verifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    });

    const authData = await authResponse.json();
    if (!authResponse.ok) {
      throw new Error(authData.error?.message || 'Invalid credentials');
    }

    const uid = authData.localId;
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) throw new Error('User profile not found');

    const { role, hospitalId } = userDoc.data();
    const token = jwt.sign(
      { uid, role, email, hospitalId: hospitalId || null },
      getJwtSecret(),
      { expiresIn: '7d' }
    );

    res.json({ token, user: { uid, email, role, hospitalId } });

  } catch (error) {
    console.error('[Auth] Login failed:', error.message);
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// ── Me ────────────────────────────────────────────────────────────────────────
router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
