const express = require('express');
const { scrapeGear } = require('./gear-scraper.js');
const auth = require('./auth.js');
const { createRateLimiter } = require('./rate-limiter.js');

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

const listVersionRouter = require('./list-version-endpoints.js');

router.use(listVersionRouter);

// The server fetches a page for the member who typed its address: signed in only, and limited, or
// anyone could use it to reach other sites from the server's address.
const scrapeLimiter = createRateLimiter({ limit: 30, windowMs: 60 * 60 * 1000 });

// scrapeGear kept here — single route, no logical grouping
router.post('/scrapeGear', (req, res) => {
    auth.authenticateUser(req, res, async (authedReq, authedRes, user) => {
        const { url } = authedReq.body || {};
        if (!url || typeof url !== 'string') {
            return authedRes.status(400).json({ error: 'url required' });
        }
        const rate = scrapeLimiter.check(String(user._id));
        if (rate.limited) {
            authedRes.set('Retry-After', String(rate.retryAfterMinutes * 60));
            return authedRes.status(429).json({ error: 'too many requests', retryAfterMinutes: rate.retryAfterMinutes });
        }
        try {
            const parsed = new URL(url);
            if (!['http:', 'https:'].includes(parsed.protocol)) {
                return authedRes.status(400).json({ error: 'invalid url' });
            }
            const data = await scrapeGear(url);
            return authedRes.json(data);
        } catch (err) {
            if (err && err.code === 'UNSAFE_URL') {
                return authedRes.status(400).json({ error: 'url not allowed' });
            }
            return authedRes.status(502).json({ error: 'fetch failed' });
        }
    });
});

const communityRouter = require('./community-endpoints.js');

router.use('/api/community', communityRouter);

const guideRouter = require('./guide-endpoints.js');

router.use('/api/guide', guideRouter);

const supportRouter = require('./support-endpoints.js');

router.use('/api/support', supportRouter);

module.exports = router;
