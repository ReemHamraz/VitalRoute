import FieldValue
const express = require('express');
const { db } = require('../config/firebase');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.post('/send', async (req, res) => {
    try {
        const { targetId, title, body } = req.body;
        
        await db.collection('alerts').add({
            hospitalId: targetId,
            type: 'manual_notification',
            message: `${title}: ${body}`,
            isRead: false,
            createdAt: FieldValue.serverTimestamp()
        });

        res.json({ success: true });
    } catch(err) { next(err); }
});

module.exports = router;
