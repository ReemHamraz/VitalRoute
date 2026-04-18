const express = require('express');
const { db } = require('../config/firebase');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.post('/', async (req, res) => {
    try {
        const { requestingHospitalId, items, urgency, contextNote, flags, rawText } = req.body;
        const reqData = {
            requestingHospitalId,
            items: items || [],
            urgency: urgency || "NORMAL",
            rawText: rawText || "",
            status: "pending",
            contextNote: contextNote || "",
            flags: flags || [],
            matches: [],
            selectedMatch: null,
            assignedRoute: null,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        const docRef = await db.collection('supply_requests').add(reqData);
        res.status(201).json({ id: docRef.id, ...reqData });
    } catch(err) { res.status(500).json({error: err.message}); }
});

router.get('/:id', async (req, res) => {
    try {
        const doc = await db.collection('supply_requests').doc(req.params.id).get();
        if (!doc.exists) return res.status(404).json({error: 'Not found'});
        res.json({ id: doc.id, ...doc.data() });
    } catch(err) { res.status(500).json({error: err.message}); }
});

router.put('/:id/confirm-match', async (req, res) => {
    try {
        const { match } = req.body;
        await db.collection('supply_requests').doc(req.params.id).update({
            selectedMatch: match,
            status: 'in_transit',
            updatedAt: new Date()
        });
        res.json({ success: true });
    } catch(err) { res.status(500).json({error: err.message}); }
});

router.put('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        await db.collection('supply_requests').doc(req.params.id).update({
            status,
            updatedAt: new Date()
        });
        res.json({ success: true });
    } catch(err) { res.status(500).json({error: err.message}); }
});

router.get('/hospital/:id', async (req, res) => {
    try {
        const snapshot = await db.collection('supply_requests').where('requestingHospitalId', '==', req.params.id).get();
        const reqs = [];
        snapshot.forEach(doc => reqs.push({ id: doc.id, ...doc.data() }));
        res.json(reqs);
    } catch(err) { res.status(500).json({error: err.message}); }
});

module.exports = router;
