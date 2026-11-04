const DEFAULT_AUTH_RATE_LIMIT_MAX = 10;

// Requests per 15 minutes per IP on /register, /signin and /resetPassword. AUTH_RATE_LIMIT_MAX
// raises it for the e2e suite (it registers dozens of users from one IP). Anything that is
// not a positive integer keeps the default, so the limit can never be switched off by accident.
// The optional second argument sets another default, for limits that are not 10 (see forgotLimiter).
function authRateLimitMax(value, fallback = DEFAULT_AUTH_RATE_LIMIT_MAX) {
    const text = String(value === undefined ? '' : value).trim();
    if (!/^\d+$/.test(text)) return fallback;
    const max = Number(text);
    return max > 0 ? max : fallback;
}

module.exports = { authRateLimitMax };
