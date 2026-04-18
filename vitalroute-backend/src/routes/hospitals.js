const express = require('express');
const { db } = require('../config/firebase');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
    try {
        const snapshot = await db.collection('hospitals').get();
        const hospitals = [];
        snapshot.forEach(doc => hospitals.push({ id: doc.id, lat: doc.data().lat, lng: doc.data().lng, status: doc.data().status }));
        res.json(hospitals);
    } catch(err) { res.status(500).json({error: err.message}); }
});

router.get('/:id', async (req, res) => {
    try {
        const doc = await db.collection('hospitals').doc(req.params.id).get();
        if (!doc.exists) return res.status(404).json({error: 'Not found'});
        res.json({ id: doc.id, ...doc.data() });
    } catch(err) { res.status(500).json({error: err.message}); }
});

router.put('/:id/inventory', async (req, res) => {
    try {
        const { inventory } = req.body;
        const ref = db.collection('hospitals').doc(req.params.id);
        
        let isCritical = false;
        let isWarning = false;
        for (const [item, data] of Object.entries(inventory)) {
             if (data.quantity === 0) isCritical = true;
             else if (data.quantity < data.threshold) isWarning = true;
        }

        let status = 'green';
        if (isCritical) status = 'red';
        else if (isWarning) status = 'yellow';
        
        const reqs = await db.collection('supply_requests')
            .where('requestingHospitalId', '==', req.params.id)
            .where('urgency', '==', 'CRITICAL')
            .where('status', 'in', ['pending', 'matched']).get();
        
        if (!reqs.empty) status = 'red';

        const batch = db.batch();
        batch.update(ref, { inventory, status, lastUpdated: new Date() });
        await batch.commit();

        res.json({ success: true, status });
    } catch(err) { res.status(500).json({error: err.message}); }
});

router.get('/:id/alerts', async (req, res) => {
    try {
        const snapshot = await db.collection('alerts').where('hospitalId', '==', req.params.id).get();
        const alerts = [];
        snapshot.forEach(doc => alerts.push({ id: doc.id, ...doc.data() }));
        res.json(alerts);
    } catch(err) { res.status(500).json({error: err.message}); }
});

module.exports = router;
