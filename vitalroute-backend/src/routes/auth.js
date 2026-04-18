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
    try {
        const userRecord = await auth.getUserByEmail(email);
        const userDoc = await db.collection('users').doc(userRecord.uid).get();
        if (!userDoc.exists) throw new Error("User not found in DB");
        const role = userDoc.data().role;

        const token = jwt.sign({ uid: userRecord.uid, role, email }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
        res.json({ token, user: { uid: userRecord.uid, email, role } });
    } catch (error) {
        res.status(401).json({ error: "Invalid credentials or user not found" });
    }
});

router.get('/me', authMiddleware, async (req, res) => {
    res.json({ user: req.user });
});

module.exports = router;
