/**
 * Unit test: the public list JSON gives item links and images only when the list's share settings
 * allow them, so a value the page would hide is not readable in the response either.
 * Run with: node test/unit-public-list-links-images.js
 */

'use strict';

const assert = require('assert');
const { buildPublicList } = require('../server/public-sharing.js');

function served(publicFields) {
    return {
        library: {
            itemUnit: 'g',
            currencySymbol: '$',
            lists: [{
                id: 1, externalId: 'abc123', name: 'Trip', visibility: 'discoverable', categoryIds: [1], publicFields,
            }],
            categories: [{ id: 1, name: 'Shelter', categoryItems: [{ itemId: 1, qty: 1 }] }],
            items: [{
                id: 1,
                name: 'Tent',
                weight: 900000,
                price: 300,
                url: 'https://shop.example/tent',
                image: 'abc',
                imageUrl: 'https://img.example/tent.jpg',
            }],
        },
    };
}

function firstItem(publicFields) {
    const payload = buildPublicList(served(publicFields), 'abc123');
    return payload.categories[0].items[0];
}

let item = firstItem({});
assert.strictEqual(item.name, 'Tent', 'the gear itself is always listed');
assert.strictEqual(item.publicUrl, '', 'no link when links are off');
assert.strictEqual(item.imageUrl, '', 'no image address when images are off');
assert.strictEqual(item.image, '', 'no stored image id when images are off');
assert.strictEqual(item.price, 0, 'no price when price is off');

item = firstItem({ links: true });
assert.strictEqual(item.publicUrl, 'https://shop.example/tent');
assert.strictEqual(item.imageUrl, '');

item = firstItem({ images: true });
assert.strictEqual(item.imageUrl, 'https://img.example/tent.jpg');
assert.strictEqual(item.image, 'abc');
assert.strictEqual(item.publicUrl, '');

item = firstItem({ price: true, links: true, images: true });
assert.strictEqual(item.publicUrl, 'https://shop.example/tent');
assert.strictEqual(item.imageUrl, 'https://img.example/tent.jpg');
assert.strictEqual(item.price, 300);

console.log('unit-public-list-links-images OK');
process.exit(0);
