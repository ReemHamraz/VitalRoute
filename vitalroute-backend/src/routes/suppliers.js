const express = require('express');
const { db } = require('../config/firebase');
const authMiddleware = require('../middleware/auth');

const router = express.Router();


// ── 🌟 DEMO RESET ROUTE (Must be above /:id) ─────────────────────────────────
// POST /api/suppliers/reset-demo
router.post('/reset-demo', async (req, res, next) => {
    try {
        const suppliersRef = db.collection('suppliers');
        const snapshot = await suppliersRef.get();

        const batch = db.batch();

        snapshot.forEach((doc) => {
            // Modify these fields based on exactly how your database tracks availability
            batch.update(doc.ref, { 
                isActive: true, 
                isAvailable: true 
            });
        });

        await batch.commit();
        res.status(200).json({ message: "Database reset. All suppliers are now active and unlocked!" });
    } catch (err) { 
        next(err); 
    }
});

// Apply authentication middleware to all supplier routes
router.use(authMiddleware);

// ── 📦 STANDARD ROUTES ────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
    try {
        const snapshot = await db.collection('suppliers').get();
        const suppliers = [];
        snapshot.forEach(doc => suppliers.push({ id: doc.id, ...doc.data() }));
        res.json(suppliers);
    } catch(err) { 
        next(err); 
    }
});

router.get('/:id', async (req, res, next) => {
    try {
        const doc = await db.collection('suppliers').doc(req.params.id).get();
        if (!doc.exists) return res.status(404).json({error: 'Not found'});
        res.json({ id: doc.id, ...doc.data() });
    } catch(err) { 
        next(err); 
    }
});

router.put('/:id/inventory', async (req, res, next) => {
    try {
        // SECURITY: Lock down inventory updates
        if (req.user.uid !== req.params.id && req.user.role !== 'coordinator') {
            return res.status(403).json({ error: 'Forbidden: Cannot edit another supplier\'s inventory' });
        }

        const { inventory } = req.body;
        await db.collection('suppliers').doc(req.params.id).update({ inventory });
        res.json({ success: true });
    } catch(err) { 
        next(err); 
    }
});

module.exports = router;