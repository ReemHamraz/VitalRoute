const express = require('express');
const { matchRequest } = require('../services/matchingService');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.post('/', async (req, res) => {
    try {
        const { requestId } = req.body;
        const matches = await matchRequest(requestId);
        res.json({ success: true, matches });
    } catch(err) { res.status(500).json({error: err.message}); }
});

module.exports = router;
