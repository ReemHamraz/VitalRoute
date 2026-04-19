const express = require('express');
const { db } = require('../config/firebase');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res, next) => {
    try {
        const snapshot = await db.collection('suppliers').get();
        const suppliers = [];
        snapshot.forEach(doc => suppliers.push({ id: doc.id, ...doc.data() }));
        res.json(suppliers);
    } catch(err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
    try {
        const doc = await db.collection('suppliers').doc(req.params.id).get();
        if (!doc.exists) return res.status(404).json({error: 'Not found'});
        res.json({ id: doc.id, ...doc.data() });
    } catch(err) { next(err); }
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
    } catch(err) { next(err); }
});

module.exports = router;
router.use(authMiddleware);

router.get('/', async (req, res) => {
    try {
        const snapshot = await db.collection('suppliers').get();
        const suppliers = [];
        snapshot.forEach(doc => suppliers.push({ id: doc.id, ...doc.data() }));
        res.json(suppliers);
    } catch(err) { res.status(500).json({error: err.message}); }
});

router.get('/:id', async (req, res) => {
    try {
        const doc = await db.collection('suppliers').doc(req.params.id).get();
        if (!doc.exists) return res.status(404).json({error: 'Not found'});
        res.json({ id: doc.id, ...doc.data() });
    } catch(err) { res.status(500).json({error: err.message}); }
});

router.put('/:id/inventory', async (req, res) => {
    try {
        const { inventory } = req.body;
        await db.collection('suppliers').doc(req.params.id).update({ inventory });
        res.json({ success: true });
    } catch(err) { res.status(500).json({error: err.message}); }
});

module.exports = router;
