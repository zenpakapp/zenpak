/**
 * Unit test: the link of a creator promo code on a public profile.
 * A "domain" rule links to its domain, but its value is free text: "Lyoplilisé" used to become
 * https://Lyoplilisé, a link that goes nowhere. Only a real address is turned into a link;
 * anything else is shown as plain text.
 * Run with: node test/unit-promo-link-url.js
 */

'use strict';

const assert = require('assert');
const { stubServerModule } = require('./fixtures/list-versions-fixtures.js');

// public-sharing.js loads the database module, which would open a connection.
stubServerModule('db.js', {});

const { promoLinkUrl } = require('../server/public-sharing.js');

const domain = (match) => promoLinkUrl({ type: 'domain', match });

// A real address becomes a link, to https unless the rule says otherwise.
assert.strictEqual(domain('zpacks.com'), 'https://zpacks.com');
assert.strictEqual(domain('  zpacks.com  '), 'https://zpacks.com', 'spaces around it are ignored');
assert.strictEqual(domain('ZPACKS.COM'), 'https://ZPACKS.COM');
assert.strictEqual(domain('www.zpacks.com/promo'), 'https://www.zpacks.com/promo');
assert.strictEqual(domain('shop.example.co.uk'), 'https://shop.example.co.uk');
assert.strictEqual(domain('https://zpacks.com'), 'https://zpacks.com', 'a scheme typed by the author is not doubled');
assert.strictEqual(domain('http://zpacks.com'), 'http://zpacks.com');
assert.strictEqual(domain('lyophilisé.fr'), 'https://lyophilisé.fr', 'accented domains work');
assert.strictEqual(domain('zpacks.com:8080/x'), 'https://zpacks.com:8080/x');

// What is not an address is not a link.
assert.strictEqual(domain('Lyoplilisé'), '', 'a name without an ending');
assert.strictEqual(domain('my partner'), '', 'words');
assert.strictEqual(domain('zpacks com'), '');
assert.strictEqual(domain('localhost'), '');
assert.strictEqual(domain('192.168.1.10'), '', 'no raw IP address');
assert.strictEqual(domain(''), '');
assert.strictEqual(domain(undefined), '');
assert.strictEqual(domain('.com'), '');
assert.strictEqual(domain('a..com'), '');

// Never another scheme.
assert.strictEqual(domain('javascript:alert(1)'), '');
assert.strictEqual(domain('data:text/html,x.com'), '');
assert.strictEqual(domain('ftp://zpacks.com'), '');

// Only a domain rule links: a brand or a shop is a name.
assert.strictEqual(promoLinkUrl({ type: 'brand', match: 'zpacks.com' }), '');
assert.strictEqual(promoLinkUrl({ type: 'shop', match: 'zpacks.com' }), '');
assert.strictEqual(promoLinkUrl(null), '');

console.log('ok');
