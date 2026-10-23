const fs = require('fs');
const path = require('path');
const config = require('config');

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('./db.js');
const { logWithRequest } = require('./log.js');
const passwordAttempts = require('./password-attempts.js');

const moderatorList = config.get('moderators');
const secureCookie = (config.get('deployUrl') || '').startsWith('https');

// How long a sign-in lasts. The old value, 365 * 24 * 60 * 1000, was missing a factor 60 and meant
// about six days; this is deliberate.
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

// one day in many years this can go away.
eval(`${fs.readFileSync(path.join(__dirname, './sha3.js'))}`);

const authenticateModerator = function (req, res, callback) {
    authenticateUser(req, res, (req, res, user) => {
        if (!isModerator(user.username)) {
            return res.status(403).json({ message: 'Denied.' });
        }
        callback(req, res, user);
    });
};

// A banned account cannot sign in or keep using its session. This is said only after the right
// password, so it does not reveal which names are banned.
function refuseSuspended(res) {
    return res.status(403).json({ message: 'This account is suspended.', code: 'suspended' });
}

const authenticateUser = function (req, res, callback) {
    if (!req.cookies.lp && (!req.body.username || !req.body.password)) {
        return res.status(401).json({ message: 'Please log in.' });
    }
    if (req.body.username && req.body.password) {
        const username = String(req.body.username).toLowerCase().trim();
        const password = String(req.body.password);
        if (passwordAttempts.isLimited(req, username)) {
            return res.status(429).json({ message: 'Too many attempts. Try again in 15 minutes.' });
        }
        verifyPassword(username, password)
            .then((user) => {
                passwordAttempts.clear(req, username);
                if (user.banned) return refuseSuspended(res);
                return generateSession(req, res, user, callback);
            })
            .catch((err) => {
                if (err && err.code === 404) passwordAttempts.recordFailure(req, username);
                logWithRequest(req, err);
                if (err.code && err.message) {
                    logWithRequest(req, { message: `error on verifyPassword for: ${username}`, error: err.message });
                    res.status(err.code).json({ message: err.message });
                } else {
                    res.status(500).json({ message: 'An error occurred, please try again later.' });
                }
            });
    } else {
        db.users.findOne({ token: req.cookies.lp }, (err, user) => {
            if (err) {
                logWithRequest(req, { message: 'Error on authenticateUser else', error: err });
                return res.status(500).json({ message: 'An error occurred, please try again later.' });
            } if (!user) {
                logWithRequest(req, { message: 'bad cookie!' });
                return res.status(404).json({ message: 'Please log in again.' });
            }
            if (user.banned) return refuseSuspended(res);
            req.lighterpackusername = user.username || 'UNKNOWN';
            callback(req, res, user);
        });
    }
};

const verifyPassword = function (username, password) {
    return new Promise((resolve, reject) => {
        db.users.findOne({ username }, (err, user) => {
            if (err) {
                return reject({ code: 500, message: 'An error occurred, please try again later.' });
            } if (!user) {
                return reject({ code: 404, message: 'Invalid username and/or password.' });
            }

            bcrypt.compare(password, user.password, (err, result) => {
                if (err) {
                    return reject({ code: 500, message: 'An error occurred, please try again later.' });
                }
                if (!result) {
                    const sha3password = CryptoJS.SHA3(password + username).toString(CryptoJS.enc.Base64);
                    bcrypt.compare(sha3password, user.password, (err, result) => {
                        if (err) {
                            reject({ code: 500, message: 'An error occurred, please try again later.' });
                        }
                        if (!result) {
                            reject({ code: 404, message: 'Invalid username and/or password.' });
                        } else {
                            // Remove extra layer of hashing. Just bcrypt.
                            bcrypt.genSalt(10, (err, salt) => {
                                if (err) {
                                    return reject({ code: 500, message: 'An error occurred, please try again later.' });
                                }
                                bcrypt.hash(password, salt, (err, hash) => {
                                    if (err) {
                                        return reject({ code: 500, message: 'An error occurred, please try again later.' });
                                    }
                                    user.password = hash;
                                    db.users.save(user);
                                    resolve(user);
                                });
                            });
                        }
                    });
                } else {
                    resolve(user);
                }
            });
        });
    });
};

const generateSession = function (req, res, user, callback) {
    crypto.randomBytes(48, async (ex, buf) => {
        const token = buf.toString('hex');
        user.token = token;
        await db.users.updateOne({ _id: user._id }, { $set: { token } });
        res.cookie('lp', token, {
            path: '/', maxAge: SESSION_MAX_AGE_MS, httpOnly: true, sameSite: 'lax', secure: secureCookie,
        });
        callback(req, res, user);
    });
};

function isModerator(username) {
    return moderatorList.indexOf(username) > -1;
}

module.exports = {
    authenticateModerator,
    authenticateUser,
    verifyPassword,
    generateSession,
    isModerator,
    SESSION_MAX_AGE_MS,
};
