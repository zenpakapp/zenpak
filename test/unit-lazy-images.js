/**
 * Unit test: the images of the long lists (a row per item, per person or per event) load lazily, so
 * a list of a hundred items does not fetch a hundred pictures at once. An image that is visible on
 * arrival (the header avatar, the profile picture, the QR code, the welcome screenshot) is not on
 * this list and loads at once.
 * Run with: node test/unit-lazy-images.js
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../client');
const LISTS = [
    'components/community-people.vue',
    'components/gear-room-compare-panel.vue',
    'components/gear-room.vue',
    'components/item.vue',
    'components/person-avatar.vue',
    'views/community.vue',
    'views/public-list.vue',
];

const problems = [];
LISTS.forEach((rel) => {
    const source = fs.readFileSync(path.join(root, rel), 'utf8');
    const imgs = [...source.matchAll(/<img\b[^>]*>/g)];
    if (!imgs.length) problems.push(`${rel}: no <img> left, remove it from this list`);
    imgs.forEach(([tag]) => {
        if (!/\bloading="lazy"/.test(tag)) problems.push(`${rel}: <img> without loading="lazy"`);
    });
});

assert.deepStrictEqual(problems, [], `\n${problems.join('\n')}`);
console.log(`unit-lazy-images: ok (${LISTS.length} files)`);
