const express = require('express');
const { parseCrisisCommand } = require('../services/geminiService');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.post('/', async (req, res, next) => {
  try {
    const { rawText, hospitalId } = req.body;

    // Input validation
    if (!rawText || typeof rawText !== 'string' || rawText.trim().length < 5) {
      return res.status(400).json({ error: 'rawText is required and must be at least 5 characters' });
    }
    if (!hospitalId) {
      return res.status(400).json({ error: 'hospitalId is required' });
    }

    const parsed = await parseCrisisCommand(rawText.trim(), hospitalId);
    res.json({ success: true, parsed });

  } catch (err) {
    // Pass to global error handler with status preserved
    next(err);
  }
});

module.exports = router;
