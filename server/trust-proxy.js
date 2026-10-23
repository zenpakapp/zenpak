// How many reverse proxies stand in front of the app, which decides whose X-Forwarded-For entry
// becomes req.ip. Trusting every hop (the old setting) lets a visitor write their own address
// whenever the proxy only appends to the header, and the address keys the rate limiters.
//
// TRUST_PROXY (or the trustProxy config key) accepts:
//   a number      how many proxies to trust, counted from the app (1 for a single Caddy)
//   false, 0, no  trust none: req.ip is the connection address (right for a bare Node process)
//   true          trust every hop (only when a proxy you control rewrites the whole header)
//   anything else an Express trust proxy value such as loopback or a list of subnets
// Left unset: one proxy in production (the documented Caddy setup), none elsewhere.

function resolveTrustProxy(setting, environment) {
    if (typeof setting === 'number') return setting <= 0 ? false : setting;
    if (typeof setting === 'boolean') return setting;

    const text = typeof setting === 'string' ? setting.trim() : '';
    if (text === '') return environment === 'production' ? 1 : false;

    const lower = text.toLowerCase();
    if (['false', 'no', 'off'].includes(lower)) return false;
    if (lower === 'true') return true;
    if (/^\d+$/.test(text)) {
        const hops = parseInt(text, 10);
        return hops <= 0 ? false : hops;
    }
    return text;
}

module.exports = { resolveTrustProxy };
