const express = require('express');
const { db, FieldValue } = require('../config/firebase'); 
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.post('/', async (req, res, next) => {
    try {
        const { requestingHospitalId, items, urgency, contextNote, flags, rawText } = req.body;
        
        // SECURITY: Ensure the user is actually from the requesting hospital
        if (req.user.uid !== requestingHospitalId && req.user.role !== 'coordinator') {
            return res.status(403).json({ error: 'Forbidden: Cannot create request for another hospital' });
        }

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
            createdAt: FieldValue.serverTimestamp(), 
            updatedAt: FieldValue.serverTimestamp()
        };
        const docRef = await db.collection('supply_requests').add(reqData);
        res.status(201).json({ id: docRef.id, ...reqData });
    } catch(err) { next(err); } // Forwarded to global handler
});

router.get('/:id', async (req, res, next) => {
    try {
        const doc = await db.collection('supply_requests').doc(req.params.id).get();
        if (!doc.exists) return res.status(404).json({error: 'Not found'});
        res.json({ id: doc.id, ...doc.data() });
    } catch(err) { next(err); }
});

router.put('/:id/confirm-match', async (req, res, next) => {
    try {
        const { match } = req.body;
        // Ideally, check if req.user.uid owns this request here too
        await db.collection('supply_requests').doc(req.params.id).update({
            selectedMatch: match,
            status: 'in_transit',
            updatedAt: FieldValue.serverTimestamp()
        });
        res.json({ success: true });
    } catch(err) { next(err); }
});

router.put('/:id/status', async (req, res, next) => {
    try {
        const { status } = req.body;
        await db.collection('supply_requests').doc(req.params.id).update({
            status,
            updatedAt: FieldValue.serverTimestamp()
        });
        res.json({ success: true });
    } catch(err) { next(err); }
});

router.get('/hospital/:id', async (req, res, next) => {
    try {
        const snapshot = await db.collection('supply_requests').where('requestingHospitalId', '==', req.params.id).get();
        const reqs = [];
        snapshot.forEach(doc => reqs.push({ id: doc.id, ...doc.data() }));
        res.json(reqs);
    } catch(err) { next(err); }
});

module.exports = router;
