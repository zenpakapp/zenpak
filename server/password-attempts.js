// Failed password attempts on routes that take the username and password in the body (every
// route behind authenticateUser, not only /signin). The route limiters only cover /register,
// /signin and /resetPassword, so without this a password can be guessed through any other route.

const { authRateLimitMax } = require('./auth-rate-limit.js');

const WINDOW_MS = 15 * 60 * 1000;
const failures = new Map();

function max() {
    return authRateLimitMax(process.env.AUTH_RATE_LIMIT_MAX);
}

// Per client and name, and per name alone (a larger budget, so a spread-out guess still stops).
function keysFor(req, username) {
    return [`${req.ip}|${username}`, `name|${username}`];
}

function limitFor(key) {
    return key.startsWith('name|') ? max() * 3 : max();
}

function live(key, now) {
    const entry = failures.get(key);
    if (!entry || entry.resetAt <= now) {
        failures.delete(key);
        return null;
    }
    return entry;
}

function isLimited(req, username, now = Date.now()) {
    return keysFor(req, username).some((key) => {
        const entry = live(key, now);
        return entry && entry.count >= limitFor(key);
    });
}

function recordFailure(req, username, now = Date.now()) {
    keysFor(req, username).forEach((key) => {
        const entry = live(key, now) || { count: 0, resetAt: now + WINDOW_MS };
        entry.count += 1;
        failures.set(key, entry);
    });
}

function clear(req, username) {
    failures.delete(keysFor(req, username)[0]);
}

module.exports = {
    isLimited, recordFailure, clear, WINDOW_MS,
};
