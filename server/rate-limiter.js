// In-memory sliding-window limiter (single node): at most `limit` hits per `windowMs` for a key.
// Used by the routes that cap a member's actions per hour (copy a list, publish a version).

function createRateLimiter({ limit, windowMs }) {
    const hits = new Map();

    // Counts the hit and answers { limited: false, remaining }, or { limited: true, retryAfterMinutes }
    // without counting it when the key is already at the limit.
    function check(key, now = Date.now()) {
        const windowStart = now - windowMs;
        const timestamps = (hits.get(key) || []).filter((t) => t > windowStart);
        if (timestamps.length >= limit) {
            hits.set(key, timestamps);
            const retryAfterMs = windowMs - (now - timestamps[0]);
            return { limited: true, retryAfterMinutes: Math.max(1, Math.ceil(retryAfterMs / 60000)) };
        }
        timestamps.push(now);
        hits.set(key, timestamps);
        return { limited: false, remaining: limit - timestamps.length };
    }

    return { check, limit };
}

module.exports = { createRateLimiter };
