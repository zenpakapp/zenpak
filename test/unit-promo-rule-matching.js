/**
 * Unit test: which items a creator's affiliate rule applies to on the public list.
 * A domain rule used to need the exact bare hostname ("zpacks.com"): typing the website the way
 * a person writes it ("https://www.zpacks.com") made the link work but matched no item.
 * Run with: node test/unit-promo-rule-matching.js
 */

'use strict';

const assert = require('assert');
const { stubServerModule } = require('./fixtures/list-versions-fixtures.js');

// public-sharing.js loads the database module, which would open a connection.
stubServerModule('db.js', {});

const { resolvePublicItemLink } = require('../server/public-sharing.js');

const item = (overrides) => ({
    id: 1, name: 'Tent', brand: 'Zpacks', shop: '', url: 'https://www.zpacks.com/products/duplex', ...overrides,
});
const creator = (match, type = 'domain') => ({
    affiliateRules: [{
        type, match, promoCode: 'ZEN10', promoLabel: '10% off',
    }],
});
const promo = (rule, overrides) => resolvePublicItemLink(item(overrides), creator(...rule)).promoCode;

// A domain rule, written however the website is written.
['zpacks.com', 'ZPACKS.COM', 'www.zpacks.com', 'https://zpacks.com', 'https://www.zpacks.com/promo?x=1', ' zpacks.com '].forEach((typed) => {
    assert.strictEqual(promo([typed]), 'ZEN10', `domain rule "${typed}" applies`);
});

// Another website, a name that is not an address, an empty value: no promo.
assert.strictEqual(promo(['other.com']), '');
assert.strictEqual(promo(['notzpacks.com']), '', 'not a suffix match');
assert.strictEqual(promo(['Lyoplilisé']), '');
assert.strictEqual(promo(['']), '');
// An item with no link cannot match a domain rule.
assert.strictEqual(promo(['zpacks.com'], { url: '' }), '');

// Brand and shop rules keep their meaning.
assert.strictEqual(promo(['zpacks', 'brand']), 'ZEN10', 'brand is compared whole, capitals ignored');
assert.strictEqual(promo(['zpa', 'brand']), '');
assert.strictEqual(promo(['REI', 'shop'], { shop: 'rei' }), 'ZEN10');

// A shop rule also applies to items whose link goes to that shop, so it works without a "shop"
// field on the item (nobody can fill it in): the shop name is one of the words of the link's
// website, ignoring capitals, spaces and dashes.
const shopLink = (name, url, overrides = {}) => promo([name, 'shop'], { shop: '', url, ...overrides });
assert.strictEqual(shopLink('REI', 'https://www.rei.com/product/1'), 'ZEN10');
assert.strictEqual(shopLink('rei', 'https://REI.com/x'), 'ZEN10');
assert.strictEqual(shopLink('amazon', 'https://smile.amazon.co.uk/dp/x'), 'ZEN10', 'any word of the hostname');
assert.strictEqual(shopLink('Garage Grown Gear', 'https://www.garagegrowngear.com/x'), 'ZEN10', 'spaces in the name');
assert.strictEqual(shopLink('Garage Grown Gear', 'https://garage-grown-gear.com/x'), 'ZEN10', 'dashes in the site');
assert.strictEqual(shopLink('rei', 'https://www.reiter.com/x'), '', 'a word of the site, not any text inside it');
assert.strictEqual(shopLink('amazon', 'https://example.com/amazon/tent'), '', 'not the path of another site');
assert.strictEqual(shopLink('rei', ''), '', 'an item with no link and no shop');
assert.strictEqual(shopLink('', 'https://www.rei.com/x'), '');
assert.strictEqual(shopLink('r', 'https://r.example/x'), '', 'a one-letter name is too vague');
assert.strictEqual(shopLink('rei', 'not a url'), '');
// The shop field of an item still counts, when it is there.
assert.strictEqual(shopLink('REI', '', { shop: ' rei ' }), 'ZEN10');
assert.strictEqual(shopLink('REI', 'https://other.example/x', { shop: 'Backcountry' }), '');

console.log('ok');
