const express = require('express');
const jwt = require('jsonwebtoken');
const { auth, db } = require('../config/firebase');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
    const { email, password, role } = req.body;
    if (!['hospital_admin', 'supplier', 'coordinator'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
    }
    
    try {
        const userRecord = await auth.createUser({ email, password });
        await db.collection('users').doc(userRecord.uid).set({ email, role });
        
        const token = jwt.sign({ uid: userRecord.uid, role, email }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
        res.status(201).json({ token, user: { uid: userRecord.uid, email, role } });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const webApiKey = process.env.FIREBASE_WEB_API_KEY; // You MUST add this to your .env from Firebase Console -> Project Settings -> Web API Key

    if (!webApiKey) {
        return res.status(500).json({ error: "Server missing FIREBASE_WEB_API_KEY" });
    }

    try {
        // 1. Actually verify the password using Firebase Auth REST API
        const verifyUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${webApiKey}`;
        const authResponse = await fetch(verifyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, returnSecureToken: true })
        });

        const authData = await authResponse.json();

        if (!authResponse.ok) {
            throw new Error(authData.error.message || "Invalid credentials");
        }

        const uid = authData.localId;

        // 2. Fetch their role from Firestore
        const userDoc = await db.collection('users').doc(uid).get();
        if (!userDoc.exists) throw new Error("User role not found in DB");
        const role = userDoc.data().role;

        // 3. Issue your custom JWT
        const token = jwt.sign({ uid, role, email }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
        res.json({ token, user: { uid, email, role } });

    } catch (error) {
        console.error("[Auth] Login failed:", error.message);
        res.status(401).json({ error: "Invalid credentials or user not found" });
    }
});

router.get('/me', authMiddleware, async (req, res) => {
    res.json({ user: req.user });
});

module.exports = router;
