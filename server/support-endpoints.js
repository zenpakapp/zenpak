const express = require('express');
const config = require('config');
const router = express.Router();
const { sendMail } = require('./mailgun.js');

router.post('/interest', async (req, res) => {
    const email = String(req.body && req.body.email || '').trim();
    const tier = String(req.body && req.body.tier || '').trim();
    const message = String(req.body && req.body.message || '').trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ message: 'Invalid email' });
    }
    if (!['trail', 'guide'].includes(tier)) {
        return res.status(400).json({ message: 'Invalid tier' });
    }

    try {
        const adminEmail = (config.has('adminEmail') && config.get('adminEmail')) || 'fxbenard@gmail.com';
        await sendMail({
            from: 'LighterPack+ <noreply@lighterpack.app>',
            to: adminEmail,
            subject: `[LighterPack+] Interest: ${tier} — ${email}`,
            text: `Email: ${email}\nTier: ${tier}\nMessage: ${message || '(none)'}`,
        });
    } catch {
        // Mailgun may be unconfigured in dev — don't fail the request
    }

    return res.status(200).json({ ok: true });
});

module.exports = router;
