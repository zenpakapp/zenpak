const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const express = require('express');

const router = express.Router();
const { logWithRequest } = require('./log.js');

const db = require('./db.js');

const { authenticateModerator } = require('./auth.js');
const {
    applyOffer, isOfferActive, OfferError, revokeOffer,
} = require('./plan-offers.js');
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
                    banned: Boolean(user.banned),
                    // The offer the account is running on, so the moderator can withdraw it.
                    offer: isOfferActive(user) ? { plan: user.billing.plan, currentPeriodEnd: user.billing.currentPeriodEnd } : null,
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
        crypto.randomBytes(12, (ex, buf) => {
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
const OFFER_ERROR_STATUS = {
    'invalid-plan': 400,
    'invalid-months': 400,
    'active-subscription': 409,
    'permanent-plan': 409,
    'no-offer': 409,
};

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

const LIST_SEARCH_LIMIT = 20;

// Finds a published list by its name or its author, to feature or unpublish it without a report.
// With nothing typed it returns the newest lists.
async function searchLists(req, res) {
    const text = String(req.query.q || '').trim();
    const query = {};
    if (text) {
        const pattern = new RegExp(escapeRegExp(text), 'i');
        query.$or = [{ name: pattern }, { ownerUsername: pattern }];
    }
    // Only the featured lists, to manage them.
    if (req.query.featured === '1') query.featured = true;

    try {
        const lists = await db.publicLists.findSorted(query, { updatedAt: -1 }, LIST_SEARCH_LIMIT);
        return res.json({
            results: lists.map((list) => ({
                externalId: list.externalId,
                name: list.name,
                ownerUsername: list.ownerUsername,
                featured: Boolean(list.featured),
            })),
        });
    } catch (error) {
        logWithRequest(req, { message: 'MODERATION List search error', error: error.message });
        return res.status(500).json({ message: 'An error occurred' });
    }
}

router.get('/moderation/search-lists', (req, res) => {
    authenticateModerator(req, res, searchLists);
});

// Withdraws a running offer before its date.
async function revokePlanOffer(req, res, moderator) {
    const username = String(req.body.username || '').toLowerCase().trim();
    logWithRequest(req, { message: 'MODERATION Revoke offer start', username, by: moderator.username });

    try {
        const user = username ? await db.users.findOne({ username }) : null;
        if (!user) {
            return res.status(404).json({ message: 'Unknown user.', code: 'unknown-user' });
        }

        let plan;
        try {
            plan = revokeOffer(user, { revokedBy: moderator.username });
        } catch (error) {
            if (error instanceof OfferError) {
                return res.status(OFFER_ERROR_STATUS[error.code] || 400).json({ message: error.message, code: error.code });
            }
            throw error;
        }

        await db.users.save(user);
        syncUserPublicLists(user).catch(() => {});
        logWithRequest(req, {
            message: 'MODERATION Revoke offer succeeded', username, plan, by: moderator.username,
        });
        return res.json({ ok: true, plan });
    } catch (error) {
        logWithRequest(req, { message: 'MODERATION Revoke offer error', username, error: error.message });
        return res.status(500).json({ message: 'An error occurred' });
    }
}

router.post('/moderation/revoke-offer', (req, res) => {
    authenticateModerator(req, res, (authedReq, authedRes, moderator) => revokePlanOffer(authedReq, authedRes, moderator));
});

module.exports = router;
