const express = require('express');
const config = require('config');

const router = express.Router();
const { sendMail } = require('./email-provider.js');
const { createRateLimiter } = require('./rate-limiter.js');

// Each request sends a mail to the admin: anyone can call it, so it is limited per address and capped.
const interestLimiter = createRateLimiter({ limit: 5, windowMs: 60 * 60 * 1000 });
const EMAIL_MAX_LENGTH = 254;
const MESSAGE_MAX_LENGTH = 2000;

router.post('/interest', async (req, res) => {
    const email = String(req.body && req.body.email || '').trim();
    const tier = String(req.body && req.body.tier || '').trim();
    const message = String(req.body && req.body.message || '').trim();

    const rate = interestLimiter.check(req.ip || 'anon');
    if (rate.limited) {
        res.set('Retry-After', String(rate.retryAfterMinutes * 60));
        return res.status(429).json({ message: 'Too many requests', retryAfterMinutes: rate.retryAfterMinutes });
    }
    if (!email || email.length > EMAIL_MAX_LENGTH || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ message: 'Invalid email' });
    }
    if (message.length > MESSAGE_MAX_LENGTH) {
        return res.status(400).json({ message: 'Message too long' });
    }
    if (!['trail', 'guide'].includes(tier)) {
        return res.status(400).json({ message: 'Invalid tier' });
    }

    try {
        const adminEmail = (config.has('adminEmail') && config.get('adminEmail')) || 'fxbenard@gmail.com';
        await sendMail({
            from: 'ZenPak <noreply@zenpak.app>',
            to: adminEmail,
            subject: `[ZenPak] Interest: ${tier} — ${email}`,
            text: `Email: ${email}\nTier: ${tier}\nMessage: ${message || '(none)'}`,
        });
    } catch {
        // Email sending may be unconfigured locally — don't fail the request.
    }

    return res.status(200).json({ ok: true });
});

module.exports = router;
