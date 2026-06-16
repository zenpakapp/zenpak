const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const config = require('config');
const crypto = require('crypto');
const express = require('express');
const db = require('./db.js');
const { generateSession } = require('./auth.js');
const { Library } = require('../client/dataTypes.js');

const router = express.Router();

function slugifyEmail(email) {
    return email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 20);
}

const googleClientId = config.get('googleClientId');
const googleClientSecret = config.get('googleClientSecret');
const oauthEnabled = !!(googleClientId && googleClientSecret);

if (oauthEnabled) {
    passport.use(new GoogleStrategy(
        {
            clientID: googleClientId,
            clientSecret: googleClientSecret,
            callbackURL: config.get('googleCallbackUrl'),
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
                const googleId = profile.id;
                const avatarUrl = profile.photos && profile.photos[0] ? profile.photos[0].value : undefined;

                const byGoogleId = await db.users.findOne({ googleId });
                if (byGoogleId) return done(null, byGoogleId);

                if (email) {
                    const byEmail = await db.users.findOne({ email });
                    if (byEmail) {
                        byEmail.googleId = googleId;
                        if (!byEmail.avatarUrl && avatarUrl) byEmail.avatarUrl = avatarUrl;
                        await db.users.save(byEmail);
                        return done(null, byEmail);
                    }
                }

                const tempUsername = `oauth_${googleId.slice(-12)}`;
                const suggestedUsername = slugifyEmail(email || googleId);

                const newUser = {
                    username: tempUsername,
                    googleId,
                    email: email || undefined,
                    token: '',
                    needsUsername: true,
                    suggestedUsername,
                    library: new Library().save(),
                };

                if (avatarUrl) newUser.avatarUrl = avatarUrl;

                const inserted = await db.users.save(newUser);
                return done(null, inserted);
            } catch (err) {
                return done(err);
            }
        },
    ));

    router.get('/api/auth/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

    router.get(
        '/api/auth/google/callback',
        passport.authenticate('google', { session: false, failureRedirect: '/welcome?error=oauth' }),
        async (req, res) => {
            const user = req.user;

            if (user.needsUsername) {
                const setupToken = crypto.randomUUID();
                user.setupToken = setupToken;
                await db.users.save(user);
                const suggested = user.suggestedUsername ? encodeURIComponent(user.suggestedUsername) : '';
                res.cookie('oauth_setup_token', setupToken, { path: '/', httpOnly: false, maxAge: 10 * 60 * 1000 });
                res.cookie('oauth_setup_suggested', suggested, { path: '/', httpOnly: false, maxAge: 10 * 60 * 1000 });
                return res.redirect('/welcome');
            }

            generateSession(req, res, user, (_req, _res) => {
                _res.redirect('/');
            });
        },
    );

    router.post('/api/auth/google/set-username', express.json(), async (req, res) => {
        const { username, setupToken } = req.body;

        if (!setupToken) return res.status(400).json({ message: 'Missing setup token.' });
        if (!username) return res.status(400).json({ message: 'Username is required.' });

        const clean = String(username).trim();
        if (!/^[a-zA-Z0-9_]{3,20}$/.test(clean)) {
            return res.status(400).json({ message: 'Username must be 3-20 characters: letters, numbers, or underscores.' });
        }

        try {
            const user = await db.users.findOne({ setupToken });
            if (!user) return res.status(404).json({ message: 'Invalid or expired setup token.' });

            const taken = await db.users.findOne({ username: clean, _id: { $ne: user._id } });
            if (taken) return res.status(409).json({ message: 'Username already taken.' });

            user.username = clean;
            user.setupToken = undefined;
            user.needsUsername = undefined;
            user.suggestedUsername = undefined;

            generateSession(req, res, user, (_req, _res) => {
                _res.json({ ok: true });
            });
        } catch (err) {
            res.status(500).json({ message: 'An error occurred, please try again later.' });
        }
    });
}

router.post('/api/auth/signout', (req, res) => {
    res.clearCookie('lp', { path: '/' });
    res.json({ ok: true });
});

module.exports = router;
