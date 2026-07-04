const express = require('express');
const { scrapeGear } = require('./gear-scraper.js');

const router = express.Router();

const authRouter = require('./auth-endpoints.js');
router.use(authRouter);

const libraryRouter = require('./library-endpoints.js');
router.use(libraryRouter);

const accountRouter = require('./account-endpoints.js');
router.use(accountRouter);

const profileRouter = require('./profile-endpoints.js');
router.use(profileRouter);

const publicRouter = require('./public-endpoints.js');
router.use(publicRouter);

// scrapeGear kept here — single route, no logical grouping
router.post('/scrapeGear', async (req, res) => {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'url required' });
    }
    try {
        const parsed = new URL(url);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            return res.status(400).json({ error: 'invalid url' });
        }
        const data = await scrapeGear(url);
        return res.json(data);
    } catch (err) {
        return res.status(502).json({ error: err.message || 'fetch failed' });
    }
});

const communityRouter = require('./community-endpoints.js');
router.use('/api/community', communityRouter);

const guideRouter = require('./guide-endpoints.js');
router.use('/api/guide', guideRouter);

const supportRouter = require('./support-endpoints.js');
router.use('/api/support', supportRouter);

module.exports = router;
