'use strict';

const {
    securityHeaders,
    errorHandler,
    REQUEST_BODY_LIMIT,
} = require('../server/security.js');

let passed = 0;
let failed = 0;

function assert(description, condition) {
    if (condition) {
        console.log(`  PASS  ${description}`);
        passed++;
    } else {
        console.error(`  FAIL  ${description}`);
        failed++;
    }
}

function makeResponse() {
    return {
        headers: {},
        statusCode: 200,
        body: null,
        setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
        removeHeader(name) { delete this.headers[name.toLowerCase()]; },
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; },
    };
}

function run() {
    const response = makeResponse();
    response.headers['x-powered-by'] = 'Express';
    securityHeaders({ environment: 'production' })({ secure: true }, response, () => {});

    assert('removes the Express fingerprint', !response.headers['x-powered-by']);
    assert('sets a content security policy', response.headers['content-security-policy'].includes("default-src 'self'"));
    assert('prevents MIME sniffing', response.headers['x-content-type-options'] === 'nosniff');
    assert('prevents third-party framing', response.headers['x-frame-options'] === 'SAMEORIGIN');
    assert('sets HSTS for secure production traffic', response.headers['strict-transport-security'].includes('max-age='));
    assert('uses a bounded request body limit', REQUEST_BODY_LIMIT === '10mb');

    const errorResponse = makeResponse();
    errorHandler(new SyntaxError('secret stack details'), {}, errorResponse, () => {});
    assert('invalid JSON returns HTTP 400', errorResponse.statusCode === 400);
    assert('error response does not expose details', errorResponse.body.error === 'Invalid JSON payload');

    console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
    process.exit(failed > 0 ? 1 : 0);
}

run();
