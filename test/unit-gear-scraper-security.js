'use strict';

const {
    assertSafeOutboundUrl,
    isPrivateAddress,
} = require('../server/gear-scraper.js');

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

async function rejects(description, operation) {
    try {
        await operation();
        assert(description, false);
    } catch (err) {
        assert(description, err && err.code === 'UNSAFE_URL');
    }
}

async function run() {
    assert('loopback IPv4 is private', isPrivateAddress('127.0.0.1'));
    assert('link-local IPv4 is private', isPrivateAddress('169.254.169.254'));
    assert('private IPv4 is private', isPrivateAddress('10.1.2.3'));
    assert('loopback IPv6 is private', isPrivateAddress('::1'));
    assert('IPv4-mapped loopback is private', isPrivateAddress('::ffff:7f00:1'));
    assert('public IPv4 is allowed', !isPrivateAddress('93.184.216.34'));
    assert('unrelated public IPv4 is allowed', !isPrivateAddress('203.1.1.1'));

    await rejects('rejects a literal loopback host', () => assertSafeOutboundUrl('http://127.0.0.1/admin'));
    await rejects('rejects credentials embedded in a URL', () => assertSafeOutboundUrl('https://user:pass@example.com/'));
    await rejects('rejects a hostname resolving to a private address', () => assertSafeOutboundUrl(
        'https://internal.example/resource',
        async () => [{ address: '192.168.1.20', family: 4 }],
    ));

    const safe = await assertSafeOutboundUrl(
        'https://example.com/product',
        async () => [{ address: '93.184.216.34', family: 4 }],
    );
    assert('allows a public HTTPS URL', safe.hostname === 'example.com');

    console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
    process.exit(failed > 0 ? 1 : 0);
}

run();
