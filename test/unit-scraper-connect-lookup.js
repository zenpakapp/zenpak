/**
 * Unit test: the scraper checks the address it connects to in the connection lookup itself, so a
 * hostname whose DNS answer changes after the safety check (rebinding) still cannot reach a
 * private address.
 * Run with: node test/unit-scraper-connect-lookup.js
 */

'use strict';

const assert = require('assert');
const { safeLookup } = require('../server/gear-scraper.js');

const lookup = (hostname, options) => new Promise((resolve) => {
    safeLookup(hostname, options, (err, address, family) => resolve({ err, address, family }));
});

(async () => {
    // "localhost" resolves to a loopback address: the lookup itself refuses it.
    let result = await lookup('localhost', {});
    assert.ok(result.err, 'a private answer is refused');
    assert.strictEqual(result.err.code, 'UNSAFE_URL');

    // Same when the caller asks for every address.
    result = await lookup('localhost', { all: true });
    assert.ok(result.err);
    assert.strictEqual(result.err.code, 'UNSAFE_URL');

    console.log('unit-scraper-connect-lookup: ok');
})().catch((err) => { console.error(err); process.exit(1); });
