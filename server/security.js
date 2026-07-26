'use strict';

const REQUEST_BODY_LIMIT = '10mb';

function securityHeaders(options = {}) {
    const environment = String(options.environment || 'production');
    const scriptPolicy = environment === 'production'
        ? "script-src 'self'"
        : "script-src 'self' 'unsafe-eval'";

    return function setSecurityHeaders(req, res, next) {
        res.removeHeader('X-Powered-By');
        res.setHeader('Content-Security-Policy', [
            "default-src 'self'",
            scriptPolicy,
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https:",
            "font-src 'self' data:",
            "connect-src 'self' https: wss:",
            "object-src 'none'",
            "base-uri 'self'",
            "frame-ancestors 'self'",
            "form-action 'self'",
        ].join('; '));
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'SAMEORIGIN');

        if (environment === 'production' && req.secure) {
            res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        }

        next();
    };
}

function errorHandler(err, req, res, next) {
    if (res.headersSent) {
        return next(err);
    }

    if (err && (err.type === 'entity.parse.failed' || err instanceof SyntaxError)) {
        return res.status(400).json({ error: 'Invalid JSON payload' });
    }

    return res.status(500).json({ error: 'Internal server error' });
}

module.exports = {
    REQUEST_BODY_LIMIT,
    securityHeaders,
    errorHandler,
};
