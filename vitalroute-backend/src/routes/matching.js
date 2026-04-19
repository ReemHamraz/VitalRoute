const express = require('express');
const { matchRequest } = require('../services/matchingService');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.post('/', async (req, res, next) => {
  try {
    const { requestId } = req.body;
    if (!requestId) return res.status(400).json({ error: 'requestId is required' });

    const results = await matchRequest(requestId);
    res.json({ success: true, results });
  } catch (err) {
    next(err); // forwards to global error handler in index.js
  }
});

module.exports = router;
