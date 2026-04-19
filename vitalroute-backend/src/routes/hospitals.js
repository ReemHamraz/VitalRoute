const express = require('express');
const { db, FieldValue } = require('../config/firebase'); // Import FieldValue
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// ── GET ALL HOSPITALS (Map View) ──────────────────────────────────────────────
router.get('/', async (req, res, next) => {
    try {
        const snapshot = await db.collection('hospitals').get();
        const hospitals = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            hospitals.push({ 
                id: doc.id, 
                lat: data.lat, 
                lng: data.lng, 
                status: data.status 
            });
        });
        res.json(hospitals);
    } catch(err) { 
        next(err); 
    }
});

// ── GET SINGLE HOSPITAL ───────────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
    try {
        const doc = await db.collection('hospitals').doc(req.params.id).get();
        if (!doc.exists) return res.status(404).json({error: 'Hospital not found'});
        res.json({ id: doc.id, ...doc.data() });
    } catch(err) { 
        next(err); 
    }
});

// ── UPDATE INVENTORY (Security Locked) ────────────────────────────────────────
router.put('/:id/inventory', async (req, res, next) => {
    try {
        // SECURITY CHECK: Ensure the logged-in user matches the hospital ID
        // (Assuming the Firebase Auth UID is used as the hospital document ID)
        if (req.user.uid !== req.params.id && req.user.role !== 'coordinator') {
            return res.status(403).json({ error: 'Forbidden: Cannot edit another hospital\'s inventory' });
        }

        const { inventory } = req.body;
        if (!inventory) return res.status(400).json({ error: 'Inventory data required' });

        const ref = db.collection('hospitals').doc(req.params.id);
        
        let isCritical = false;
        let isWarning = false;
        
        for (const [item, data] of Object.entries(inventory)) {
             if (data.quantity === 0) isCritical = true;
             else if (data.quantity <= data.threshold) isWarning = true;
        }

        let status = 'green';
        if (isCritical) status = 'red';
        else if (isWarning) status = 'yellow';
        
        // Check for active critical requests before finalizing status
        const reqs = await db.collection('supply_requests')
            .where('requestingHospitalId', '==', req.params.id)
            .where('urgency', '==', 'CRITICAL')
            .where('status', 'in', ['pending', 'matched'])
            .get();
        
        if (!reqs.empty) status = 'red';

        // Using update() instead of batch() since we are only writing to one document
        await ref.update({ 
            inventory, 
            status, 
            lastUpdated: FieldValue.serverTimestamp() // Syncs with Google's servers
        });

        res.json({ success: true, status });
    } catch(err) { 
        next(err); 
    }
});

// ── GET ALERTS (Sorted) ───────────────────────────────────────────────────────
router.get('/:id/alerts', async (req, res, next) => {
    try {
        // SECURITY CHECK: Only allow reading own alerts
        if (req.user.uid !== req.params.id && req.user.role !== 'coordinator') {
            return res.status(403).json({ error: 'Forbidden: Cannot view another hospital\'s alerts' });
        }

        const snapshot = await db.collection('alerts')
            .where('hospitalId', '==', req.params.id)
            .orderBy('createdAt', 'desc') // FIX: Newest alerts first
            .limit(50)                    // FIX: Prevent massive payloads
            .get();
            
        const alerts = [];
        snapshot.forEach(doc => alerts.push({ id: doc.id, ...doc.data() }));
        res.json(alerts);
    } catch(err) { 
        // NOTE: If you get a "Requires Index" error in the console here,
        // Firebase will provide a direct link in the error message. Click it to build the index!
        next(err); 
    }
});

module.exports = router;
