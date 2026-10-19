/**
 * Unit test: the link of a creator promo code on a public profile.
 * A "domain" rule links to its domain, but its value is free text: "Lyoplilisé" used to become
 * https://Lyoplilisé, a link that goes nowhere. Only a real address is turned into a link;
 * anything else is shown as plain text.
 * Run with: node test/unit-promo-link-url.js
 */

'use strict';

const assert = require('assert');
// Shared by the server (public profile) and the Guide editor (warning on a rule).
const { promoLinkUrl, ruleHostname } = require('../client/utils/promo-link.js');

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

// The hostname a domain rule matches against an item's link: the website itself, however it was
// typed (scheme, www., path, capitals), the way an item's own hostname is read.
const host = (match) => ruleHostname({ type: 'domain', match });
assert.strictEqual(host('zpacks.com'), 'zpacks.com');
assert.strictEqual(host('https://www.Zpacks.com/promo?x=1'), 'zpacks.com');
assert.strictEqual(host('  WWW.zpacks.com  '), 'zpacks.com');
assert.strictEqual(host('shop.example.co.uk/path'), 'shop.example.co.uk');
assert.strictEqual(host('zpacks.com:8080'), 'zpacks.com', 'a port is not part of the website');
assert.strictEqual(host('Lyoplilisé'), '', 'not an address: matches nothing');
assert.strictEqual(host('my partner'), '');
assert.strictEqual(host(''), '');
assert.strictEqual(ruleHostname({ type: 'brand', match: 'zpacks.com' }), '', 'only a domain rule has a hostname');
assert.strictEqual(ruleHostname(null), '');

console.log('ok');
