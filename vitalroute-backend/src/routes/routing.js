const express = require('express');
const { getDirections } = require('../services/mapsService');
const { db } = require('../config/firebase');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.post('/', async (req, res) => {
    try {
        const { originLat, originLng, destLat, destLng, requestId } = req.body;
        const directions = await getDirections(originLat, originLng, destLat, destLng);
        
        if (requestId) {
            await db.collection('supply_requests').doc(requestId).update({
                assignedRoute: directions
            });
        }
        
        res.json({ directions });
    } catch(err) { next(err); }
});

module.exports = router;
