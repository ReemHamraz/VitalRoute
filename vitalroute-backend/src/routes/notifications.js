const express = require('express');
const { db, FieldValue } = require('../config/firebase'); // Fix: Use require and destructure FieldValue
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.post('/send', async (req, res, next) => {
    try {
        const { targetId, title, body } = req.body;
        
        await db.collection('alerts').add({
            hospitalId: targetId,
            type: 'manual_notification',
            message: `${title}: ${body}`,
            isRead: false,
            createdAt: FieldValue.serverTimestamp() // Fix: Uses Firestore server time
        });

        res.json({ success: true });
    } catch(err) { 
        next(err); // Fix: Forwards to the global error handler
    }
});

module.exports = router;