/**
 * Unit test: the visit statistics (Umami) are off until the hosted config gives a script address
 * and a site id. When on, the tag asks for as little as possible, and the security policy lets
 * that one script through and nothing else.
 * Run with: node test/unit-analytics.js
 */

'use strict';

const assert = require('assert');
const { analyticsTag, analyticsOrigin } = require('../server/analytics.js');
const { securityHeaders } = require('../server/security.js');

// Off: no script address, no site id, or neither.
assert.strictEqual(analyticsTag({}), '');
assert.strictEqual(analyticsTag({ scriptUrl: 'https://cloud.umami.is/script.js' }), '');
assert.strictEqual(analyticsTag({ websiteId: 'abc' }), '');
assert.strictEqual(analyticsTag({ scriptUrl: '', websiteId: '' }), '');
assert.strictEqual(analyticsOrigin({}), '');
assert.strictEqual(analyticsOrigin({ scriptUrl: 'not a url', websiteId: 'abc' }), '');

// On: one deferred script, with the privacy options.
const config = { scriptUrl: 'https://cloud.umami.is/script.js', websiteId: '4f1c-2a' };
const tag = analyticsTag(config);
assert.ok(tag.startsWith('<script '), 'a script tag');
assert.ok(tag.includes('defer'), 'does not block the page');
assert.ok(tag.includes('src="https://cloud.umami.is/script.js"'));
assert.ok(tag.includes('data-website-id="4f1c-2a"'));
assert.ok(tag.includes('data-do-not-track="true"'), 'respects Do Not Track');
assert.ok(tag.includes('data-exclude-search="true"'), 'the search typed is not sent');
assert.ok(tag.includes('data-before-send="zenpakAnalyticsBeforeSend"'), 'private pages are filtered by our function');
assert.strictEqual(analyticsOrigin(config), 'https://cloud.umami.is');

// What is typed in the config cannot break out of the tag.
const hostile = analyticsTag({ scriptUrl: 'https://cloud.umami.is/script.js', websiteId: '"><script>alert(1)</script>' });
assert.ok(!hostile.includes('<script>alert'), 'the id is escaped');
assert.strictEqual(analyticsTag({ scriptUrl: 'javascript:alert(1)', websiteId: 'abc' }), '', 'only http(s) scripts');

// The security policy: unchanged without analytics, the one origin added with it.
function scriptPolicy(options) {
    let policy = '';
    securityHeaders(options)({ secure: false }, {
        removeHeader() {},
        setHeader(name, value) { if (name === 'Content-Security-Policy') policy = value; },
    }, () => {});
    return policy.split('; ').find((part) => part.startsWith('script-src'));
}
assert.strictEqual(scriptPolicy({ environment: 'production' }), "script-src 'self'");
assert.strictEqual(scriptPolicy({ environment: 'production', analyticsOrigin: '' }), "script-src 'self'");
assert.strictEqual(
    scriptPolicy({ environment: 'production', analyticsOrigin: 'https://cloud.umami.is' }),
    "script-src 'self' https://cloud.umami.is",
);

console.log('ok');
