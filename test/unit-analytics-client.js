/**
 * Unit test: the browser side of the visit statistics. Only public pages are counted as visits;
 * the account and the editor are not. A named event (sign-up, copy, publish) always goes through,
 * even from a private page, and nothing is sent when the script is not there.
 * Run with: node test/unit-analytics-client.js
 */

'use strict';

const assert = require('assert');
const { shouldTrackPath, beforeSend, trackEvent } = require('../client/utils/analytics.js');

// Public pages are measured.
['/welcome', '/signin', '/register', '/community', '/community/feed', '/pricing', '/about', '/guide',
    '/p/abc123', '/u/zenpak', '/privacy', '/terms'].forEach((path) => {
    assert.strictEqual(shouldTrackPath(path), true, path);
});
// The editor and the account are not.
['/', '/account', '/settings', '/verify-email', '/reset-password/abc', '/forgot-password'].forEach((path) => {
    assert.strictEqual(shouldTrackPath(path), false, path);
});

// A page view of a private page is dropped; a public one is kept as it is.
const publicView = { url: '/p/abc123', website: 'site' };
assert.strictEqual(beforeSend('event', publicView), publicView);
assert.strictEqual(beforeSend('event', { url: '/', website: 'site' }), false);
assert.strictEqual(beforeSend('event', { url: 'https://zenpak.app/account?x=1' }), false);
assert.deepStrictEqual(beforeSend('event', { url: 'https://zenpak.app/pricing?plan=kin' }), { url: 'https://zenpak.app/pricing?plan=kin' });

// A named event goes through from anywhere: a list published from the editor still counts.
const named = { url: '/', name: 'list-published' };
assert.strictEqual(beforeSend('event', named), named);

// Without the script nothing happens and nothing fails.
delete global.window;
assert.doesNotThrow(() => trackEvent('signup'));
global.window = {};
assert.doesNotThrow(() => trackEvent('signup'));

// With the script, the event name is passed on, with no data of the person.
const sent = [];
global.window = { umami: { track: (...args) => sent.push(args) } };
trackEvent('signup');
trackEvent('plan-click', { plan: 'kin' });
assert.deepStrictEqual(sent, [['signup'], ['plan-click', { plan: 'kin' }]]);

// A script that throws does not break the page.
global.window = { umami: { track() { throw new Error('blocked'); } } };
assert.doesNotThrow(() => trackEvent('signup'));

console.log('ok');
