const DEFAULT_AUTH_RATE_LIMIT_MAX = 10;

// Requests per 15 minutes per IP on /register, /signin and /resetPassword. AUTH_RATE_LIMIT_MAX
// raises it for the e2e suite (it registers dozens of users from one IP). Anything that is
// not a positive integer keeps the default, so the limit can never be switched off by accident.
function authRateLimitMax(value) {
    const text = String(value === undefined ? '' : value).trim();
    if (!/^\d+$/.test(text)) return DEFAULT_AUTH_RATE_LIMIT_MAX;
    const max = Number(text);
    return max > 0 ? max : DEFAULT_AUTH_RATE_LIMIT_MAX;
}

module.exports = { authRateLimitMax };
