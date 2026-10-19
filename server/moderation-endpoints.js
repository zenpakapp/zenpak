const bcrypt = require('bcryptjs');
const express = require('express');

const router = express.Router();
const config = require('config');
const { logWithRequest } = require('./log.js');

const db = require('./db.js');

const { authenticateModerator } = require('./auth.js');
const { applyOffer, OfferError } = require('./plan-offers.js');
const { syncUserPublicLists } = require('./public-list-projections.js');

function escapeRegExp(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

function search(req, res) {
    const searchQuery = escapeRegExp(String(req.query.q).toLowerCase().trim());
    const nameSearch = new Promise((resolve, reject) => {
        db.users.find({ username: { $regex: `${searchQuery}.*`, $options: 'si' } }, (err, users) => {
            if (err) {
                return reject(err);
            }
            return resolve(users);
        });
    });

    const emailSearch = new Promise((resolve, reject) => {
        db.users.find({ email: { $regex: `${searchQuery}.*`, $options: 'si' } }, (err, users) => {
            if (err) {
                return reject(err);
            }
            return resolve(users);
        });
    });

    Promise.all([nameSearch, emailSearch])
        .then(([nameResult, emailResult]) => {
            const seen = new Set();
            const allResults = [].concat(nameResult).concat(emailResult)
                .filter((user) => !seen.has(user.username) && seen.add(user.username))
                .map((user) => ({
                    username: user.username,
                    library: user.library,
                    email: user.email,
                }));

            res.json({ results: allResults });
        })
        .catch((err) => {
            logWithRequest(req, err);
            res.status(500).json({ message: err });
        });
}

router.get('/moderation/search', (req, res) => {
    authenticateModerator(req, res, search);
});

function resetPassword(req, res) {
    const username = String(req.body.username).toLowerCase().trim();
    logWithRequest(req, { message: 'MODERATION Reset password start', username });

    db.users.findOne({ username }, (err, user) => {
        if (err) {
            logWithRequest(req, { message: 'MODERATION Reset password lookup error', username });
            return res.status(500).json({ message: 'An error occurred' });
        } if (!user) {
            logWithRequest(req, { message: 'MODERATION Reset password for unknown', username });
            return res.status(500).json({ message: 'An error occurred.' });
        }
        require('crypto').randomBytes(12, (ex, buf) => {
            const newPassword = buf.toString('hex');

            bcrypt.genSalt(10, (err, salt) => {
                bcrypt.hash(newPassword, salt, (err, hash) => {
                    user.password = hash;
                    db.users.save(user);
                    const out = { newPassword };
                    logWithRequest(req, { message: 'MODERATION password changed', username });
                    return res.status(200).json(out);
                });
            });
        });
    });
}

router.post('/moderation/reset-password', (req, res) => {
    authenticateModerator(req, res, resetPassword);
});

function clearSession(req, res) {
    const username = String(req.body.username).toLowerCase().trim();
    logWithRequest(req, { message: 'MODERATION Clear session start', username });

    db.users.findOne({ username }, (err, user) => {
        if (err) {
            logWithRequest(req, { message: 'MODERATION Clear session lookup error', username });
            return res.status(500).json({ message: 'An error occurred' });
        } if (!user) {
            logWithRequest(req, { message: 'MODERATION Clear session for unknown', username });
            return res.status(500).json({ message: 'An error occurred.' });
        }
        user.token = '';
        db.users.save(user);
        logWithRequest(req, { message: 'MODERATION  Clear session succeeded', username });
        return res.status(200);
    });
}

router.post('/moderation/clear-session', (req, res) => {
    authenticateModerator(req, res, clearSession);
});

const DEFAULT_OFFER_MONTHS = 3;
const OFFER_ERROR_STATUS = { 'invalid-plan': 400, 'invalid-months': 400, 'active-subscription': 409 };

// Gives an account Wayfarer or Kin for a few months (a creator invited to the beta). It never sits
// on top of a Stripe subscription, and it ends by itself (see plan-offers.js).
async function offerPlan(req, res, moderator) {
    const username = String(req.body.username || '').toLowerCase().trim();
    const plan = req.body.plan;
    const months = typeof req.body.months === 'undefined' ? DEFAULT_OFFER_MONTHS : Number(req.body.months);
    logWithRequest(req, {
        message: 'MODERATION Offer plan start', username, plan, months, by: moderator.username,
    });

    try {
        const user = username ? await db.users.findOne({ username }) : null;
        if (!user) {
            return res.status(404).json({ message: 'Unknown user.', code: 'unknown-user' });
        }

        let offer;
        try {
            offer = applyOffer(user, {
                plan, months, offeredBy: moderator.username,
            });
        } catch (error) {
            if (error instanceof OfferError) {
                return res.status(OFFER_ERROR_STATUS[error.code] || 400).json({ message: error.message, code: error.code });
            }
            throw error;
        }

        await db.users.save(user);
        syncUserPublicLists(user).catch(() => {});
        logWithRequest(req, {
            message: 'MODERATION Offer plan succeeded', username, plan, until: offer.currentPeriodEnd, by: moderator.username,
        });
        return res.json({ ok: true, plan: offer.plan, currentPeriodEnd: offer.currentPeriodEnd });
    } catch (error) {
        logWithRequest(req, { message: 'MODERATION Offer plan error', username, error: error.message });
        return res.status(500).json({ message: 'An error occurred' });
    }
}

router.post('/moderation/offer-plan', (req, res) => {
    authenticateModerator(req, res, (authedReq, authedRes, moderator) => offerPlan(authedReq, authedRes, moderator));
});

module.exports = router;
