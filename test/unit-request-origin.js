'use strict';

const { resolvePublicOrigin } = require('../server/request-origin.js');

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

function makeRequest(overrides = {}) {
    return {
        protocol: 'http',
        headers: {},
        get(name) {
            return this.headers[String(name).toLowerCase()];
        },
        ...overrides,
    };
}

function run() {
    console.log('\n--- development requests prefer the incoming origin ---');
    const devRequest = makeRequest({
        headers: {
            host: 'localhost:52539',
            'x-forwarded-proto': 'https',
        },
    });
    const devOrigin = resolvePublicOrigin(devRequest, {
        environment: 'development',
        configuredOrigin: 'http://localhost:3001',
    });
    assert('development uses forwarded proto and request host', devOrigin === 'https://localhost:52539');

    console.log('\n--- production requests keep configured origin ---');
    const productionRequest = makeRequest({
        headers: {
            host: 'localhost:52539',
            'x-forwarded-proto': 'https',
        },
    });
    const productionOrigin = resolvePublicOrigin(productionRequest, {
        environment: 'production',
        configuredOrigin: 'https://justpack.app',
    });
    assert('production keeps configured deploy origin', productionOrigin === 'https://justpack.app');

    console.log('\n--- fallback uses configured origin when request host is missing ---');
    const fallbackOrigin = resolvePublicOrigin(makeRequest(), {
        environment: 'development',
        configuredOrigin: 'http://localhost:3001',
    });
    assert('missing host falls back to configured origin', fallbackOrigin === 'http://localhost:3001');

    console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
    process.exit(failed > 0 ? 1 : 0);
}

run();
