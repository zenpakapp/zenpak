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

    verifyPassword(user.username, String(req.body.password))
        .then((user) => {
            if (req.body.username !== user.username) {
                logWithRequest(req, { message: 'Bad account deletion - wrong user', requestedUsername: req.body.username, initiatedby: user.username });
                return Promise.reject(new Error('An error occurred, please try logging out and in again.'));
            }

            db.users.remove(user, true);

            deleteVersionsForOwner(user._id).catch((err) => {
                logWithRequest(req, { message: 'failed to delete list versions on account delete', username: user.username, error: err.message });
            });

            // Discover, follows and feed read their own collections: nothing of this account stays there.
            const ownerId = new ObjectId(user._id);
            [
                db.publicLists.deleteMany({ ownerId }),
                db.follows.deleteMany({ $or: [{ followerId: ownerId }, { followedId: ownerId }] }),
                db.feedEvents.deleteMany({ userId: ownerId }),
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

module.exports = router;
