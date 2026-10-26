const bcrypt = require('bcryptjs');
const express = require('express');
const { ObjectId } = require('mongodb');

const { logWithRequest } = require('./log.js');
const { authenticateUser, verifyPassword, generateSession } = require('./auth.js');
const { canonicalEmail, emailLookup } = require('./email-policy.js');
const { deleteVersionsForOwner } = require('./list-versions.js');
const { normalizeLanguage } = require('./user-language.js');
const db = require('./db.js');
const { writeFields } = require('./user-field-writes.js');
const { cancelSubscriptionsForDeletion } = require('./billing.js');
const { destroyAvatar } = require('./avatar-storage.js');

const router = express.Router();

router.post('/account', (req, res) => {
    authenticateUser(req, res, account);
});

function account(req, res, user) {
    logWithRequest(req, { message: 'Starting account changes', username: user.username });
    verifyPassword(user.username, String(req.body.currentPassword))
        .then((user) => {
            if (req.body.newPassword) {
                const newPassword = String(req.body.newPassword);
                const errors = [];

                if (newPassword.length < 5 || newPassword.length > 60) {
                    errors.push({ field: 'newPassword', message: 'Please enter a password between 5 and 60 characters.' });
                }

                if (errors.length) {
                    return res.status(400).json({ errors });
                }

                saveAccountEmail(user, req, res, () => {
                    bcrypt.genSalt(10, (err, salt) => {
                        bcrypt.hash(newPassword, salt, (err, hash) => {
                            user.password = hash;
                            logWithRequest(req, { message: 'Changing PW', username: user.username });
                            // A new password ends the other sessions: this one gets a fresh token.
                            generateSession(req, res, user, () => saveAccountUser(user, req, res));
                        });
                    });
                });
            } else if (req.body.newEmail) {
                saveAccountEmail(user, req, res, () => {
                    saveAccountUser(user, req, res);
                });
            }
        })
        .catch((err) => {
            logWithRequest(req, { message: 'Account bad current password', username: user.username });
            res.status(400).json({ errors: [{ field: 'currentPassword', message: 'Your current password is incorrect.' }] });
        });
}

function saveAccountUser(user, req, res) {
    writeFields(user, ['password', 'email', 'emailVerified', 'emailVerifyToken', 'verifyEmailSentAt'], (err) => {
        if (err) {
            logWithRequest(req, { message: 'DB error on account save', username: user.username, error: err.message });
            if (err.code === 11000 && err.message.includes('email')) {
                return res.status(400).json({ errors: [{ field: 'newEmail', message: 'A user with that email already exists.' }] });
            }
            return res.status(500).json({ errors: [{ message: 'An error occurred, please try again later.' }] });
        }

        return res.status(200).json({ message: 'success' });
    });
}

function saveAccountEmail(user, req, res, next) {
    if (!req.body.newEmail) return next();

    const email = canonicalEmail(req.body.newEmail);
    if (!email) {
        return res.status(400).json({ errors: [{ field: 'newEmail', message: 'Please enter an email.' }] });
    }

    db.users.findOne(emailLookup(email), (err, existingUser) => {
        if (err) {
            logWithRequest(req, { message: 'DB error on account email lookup', email, error: err.message });
            return res.status(500).json({ errors: [{ message: 'An error occurred, please try again later.' }] });
        }

        if (existingUser && String(existingUser._id) !== String(user._id)) {
            return res.status(400).json({ errors: [{ field: 'newEmail', message: 'A user with that email already exists.' }] });
        }

        user.email = email;
        // The new address is not proven yet: it must be verified again before Google sign-in or
        // publishing trusts it.
        // A link sent to the old address must not verify the new one either.
        user.emailVerified = false;
        user.emailVerifyToken = undefined;
        user.verifyEmailSentAt = undefined;
        logWithRequest(req, { message: 'Changing Email', username: user.username });
        return next();
    });
}

// The language the account reads the app in, kept so server-written emails and alerts can use it.
router.post('/api/account/language', (req, res) => {
    authenticateUser(req, res, async (req, res, user) => {
        const language = normalizeLanguage(req.body && req.body.language);
        if (!language) return res.status(400).json({ message: 'Unsupported language.' });
        if (user.language === language) return res.json({ language });
        try {
            user.language = language;
            await writeFields(user, ['language']);
            return res.json({ language });
        } catch (err) {
            return res.status(500).json({ message: 'An error occurred' });
        }
    });
});

router.post('/delete-account', (req, res) => {
    authenticateUser(req, res, deleteAccount);
});

function deleteAccount(req, res, user) {
    logWithRequest(req, { message: 'Starting account delete', username: user.username });

    // An account made with Google has no password: the signed-in session and the typed confirmation
    // stand for it. Without this, such an account could never be deleted.
    const identity = user.password ? verifyPassword(user.username, String(req.body.password)) : Promise.resolve(user);

    identity
        .then(async (user) => {
            if (req.body.username !== user.username) {
                logWithRequest(req, { message: 'Bad account deletion - wrong user', requestedUsername: req.body.username, initiatedby: user.username });
                return Promise.reject(new Error('An error occurred, please try logging out and in again.'));
            }

            // Stop the billing first. If Stripe refuses, nothing is deleted: a deleted account that
            // is still being charged would be worse than a failed deletion.
            try {
                await cancelSubscriptionsForDeletion(user);
            } catch (err) {
                logWithRequest(req, { message: 'failed to cancel subscriptions on account delete', username: user.username, error: err.message });
                return res.status(502).json({ errors: [{ message: 'We could not cancel your subscription, so your account was not deleted. Please try again or contact support.' }] });
            }

            db.users.remove(user, true);

            deleteVersionsForOwner(user._id).catch((err) => {
                logWithRequest(req, { message: 'failed to delete list versions on account delete', username: user.username, error: err.message });
            });

            // Discover, follows and feed read their own collections: nothing of this account stays there.
            // What is kept on purpose: Stripe's customer and our billing events (invoices are kept by law),
            // reports filed against this account or its lists (moderation record), and everything the
            // copies other accounts made of its lists hold, including the name of the original author.
            const ownerId = new ObjectId(user._id);
            const listIds = (user.library && Array.isArray(user.library.lists) ? user.library.lists : [])
                .map((list) => list.externalId)
                .filter(Boolean);
            const avatarUrl = user.library && user.library.publicProfile && user.library.publicProfile.avatarUrl;
            [
                db.publicLists.deleteMany({ ownerId }),
                db.follows.deleteMany({ $or: [{ followerId: ownerId }, { followedId: ownerId }] }),
                db.feedEvents.deleteMany({ userId: ownerId }),
                // Notifications this account received, and those that carry its name in other inboxes.
                db.notifications.deleteMany({ $or: [{ userId: ownerId }, { actorUsername: user.username }] }),
                // The record of the copies this account made. The copies other accounts made of its lists
                // are theirs: their lists and their record stay.
                db.listCopies.deleteMany({ userId: String(user._id) }),
                // View counts of its own lists.
                ...(listIds.length ? [
                    db.publicListStats.deleteMany({ externalId: { $in: listIds } }),
                    db.publicListViewers.deleteMany({ externalId: { $in: listIds } }),
                ] : []),
                // Reports this account filed.
                db.reports.deleteMany({ reporterId: ownerId }),
                // The profile photo at the image host.
                destroyAvatar(avatarUrl),
            ].forEach((op) => op.catch((err) => {
                logWithRequest(req, { message: 'failed to clean community data on account delete', username: user.username, error: err.message });
            }));

            logWithRequest(req, { message: 'Completed account delete', username: user.username });

            return res.status(200).json({ message: 'success' });
        })
        .catch((err) => {
            logWithRequest(req, { message: 'Bad account deletion - invalid password', username: req.body.username });
            res.status(400).json({ errors: [{ field: 'currentPassword', message: 'Your current password is incorrect.' }] });
        });
}

// Everything this account holds, in one JSON file: the right to get one's data, for every plan.
// Secrets (password hash, session and reset tokens) and other people's data are never in it.
const EXPORT_LIMIT = 5000;

async function usernamesOf(ids) {
    if (!ids.length) return [];
    const users = await db.users.findMany({ _id: { $in: ids } }, { projection: { username: 1 } });
    return users.map((account) => account.username).filter(Boolean).sort();
}

async function exportAccount(req, res, user) {
    try {
        const userId = new ObjectId(user._id);
        const { publicProfile, ...library } = user.library || {};
        const billing = user.billing || {};

        const [following, followers, notifications, copies, reports] = await Promise.all([
            db.follows.findMany({ followerId: userId }, { limit: EXPORT_LIMIT }),
            db.follows.findMany({ followedId: userId }, { limit: EXPORT_LIMIT }),
            db.notifications.findMany({ userId }, { limit: EXPORT_LIMIT }),
            db.listCopies.findMany({ userId: String(user._id) }, { limit: EXPORT_LIMIT }),
            db.reports.findMany({ reporterId: userId }, { limit: EXPORT_LIMIT }),
        ]);

        const body = {
            format: 'zenpak-account-export-v1',
            exportedAt: new Date().toISOString(),
            account: {
                username: user.username,
                email: user.email || null,
                emailVerified: !!user.emailVerified,
                language: user.language || null,
                signInWithGoogle: !!user.googleId,
                notificationPreferences: user.notificationPrefs || null,
                plan: (user.library && user.library.entitlements && user.library.entitlements.plan) || 'free',
                billing: {
                    provider: billing.provider || null,
                    plan: billing.plan || null,
                    status: billing.status || null,
                    interval: billing.interval || null,
                    currentPeriodEnd: billing.currentPeriodEnd || null,
                    cancelAtPeriodEnd: !!billing.cancelAtPeriodEnd,
                },
            },
            publicProfile: publicProfile || {},
            library,
            following: await usernamesOf(following.map((row) => row.followedId)),
            followers: await usernamesOf(followers.map((row) => row.followerId)),
            notifications: notifications.map((row) => ({
                type: row.type, actorUsername: row.actorUsername || null, listName: row.listName || null, createdAt: row.createdAt,
            })),
            listCopies: copies.map((row) => ({ externalId: row.externalId, version: row.version })),
            reportsFiled: reports.map((row) => ({
                targetType: row.targetType, targetId: row.targetId, reason: row.reason, status: row.status, createdAt: row.createdAt,
            })),
        };

        const filename = `zenpak-data-${String(user.username).replace(/[^a-z0-9_-]/gi, '_')}.json`;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).send(JSON.stringify(body, null, 2));
    } catch (err) {
        logWithRequest(req, { message: 'failed to export account data', username: user.username, error: err.message });
        return res.status(500).json({ message: 'An error occurred, please try again later.' });
    }
}

router.get('/api/account/export', (req, res) => {
    authenticateUser(req, res, exportAccount);
});

module.exports = router;
