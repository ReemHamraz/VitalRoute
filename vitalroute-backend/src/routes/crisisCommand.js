const express = require('express');
const { parseCrisisCommand } = require('../services/geminiService');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.post('/', async (req, res) => {
    try {
        const { rawText, hospitalId } = req.body;
        const parsed = await parseCrisisCommand(rawText, hospitalId);
        res.json(parsed);
    } catch(err) { res.status(500).json({error: err.message}); }
});

module.exports = router;
