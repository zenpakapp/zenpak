'use strict';

function readHeader(req, name) {
    if (!req || typeof req.get !== 'function') {
        return '';
    }

    return String(req.get(name) || '').trim();
}

function resolveForwardedProtocol(req) {
    const forwardedProto = readHeader(req, 'x-forwarded-proto');

    if (forwardedProto) {
        return forwardedProto.split(',')[0].trim();
    }

    return req && req.protocol ? String(req.protocol).trim() : 'http';
}

function resolveRequestOrigin(req) {
    const host = readHeader(req, 'host');

    if (!host) {
        return '';
    }

    return `${resolveForwardedProtocol(req)}://${host}`;
}

function resolvePublicOrigin(req, options = {}) {
    const configuredOrigin = String(options.configuredOrigin || '').trim();
    const environment = String(options.environment || '').trim();

    if (environment !== 'production') {
        const requestOrigin = resolveRequestOrigin(req);

        if (requestOrigin) {
            return requestOrigin;
        }
    }

    return configuredOrigin;
}

module.exports = {
    resolvePublicOrigin,
};
