/**
 * Unit test: the legacy share and embed pages draw the worn, consumable and rating icons of an item
 * row, and the unit arrow, as inline SVG and text (the sprite image they used is gone). Worn and
 * consumable are solid when on and an outline when off; the rating is counted in stars.
 * Run with: node test/unit-legacy-share-icons.js
 */

'use strict';

const assert = require('assert');

let flags = { worn: true, consumable: false, star: 2 };

function fixtureUser() {
    return {
        _id: 'user-1',
        library: {
            version: '0.3',
            itemUnit: 'g',
            totalUnit: 'g',
            optionalFields: { worn: true, consumable: true },
            lists: [{
                id: 'list-1',
                externalId: 'ext-1',
                name: 'Test list',
                visibility: 'shareable',
                categoryIds: ['cat-1'],
                publicFields: {},
            }],
            categories: [{
                id: 'cat-1',
                name: 'Category',
                color: { r: 0, g: 0, b: 0 },
                categoryItems: [
                    { itemId: 'item-1', qty: 1, worn: flags.worn, consumable: flags.consumable, star: flags.star },
                    { itemId: 'item-2', qty: 1, worn: false, consumable: !flags.consumable, star: 0 },
                ],
            }],
            items: [
                { id: 'item-1', name: 'Jacket', weight: 300000 },
                { id: 'item-2', name: 'Stove', weight: 90000 },
            ],
        },
    };
}

let publishedSnapshot = null;
require.cache[require.resolve('../server/db.js')] = {
    exports: {
        users: {
            findOne(query, callback) {
                const user = fixtureUser();
                if (callback) { callback(null, user); return undefined; }
                return Promise.resolve(user);
            },
        },
        listVersions: {
            findSorted(query) {
                return Promise.resolve(query.externalId === 'ext-1' && publishedSnapshot ? [publishedSnapshot] : []);
            },
        },
    },
    id: require.resolve('../server/db.js'),
    filename: require.resolve('../server/db.js'),
    loaded: true,
    children: [],
    paths: [],
};

const { buildFrozenLibrary } = require('../server/list-versions.js');

function publish() {
    const owner = fixtureUser();
    publishedSnapshot = {
        externalId: 'ext-1',
        version: 1,
        ownerId: owner._id,
        library: buildFrozenLibrary(owner.library, 'ext-1'),
    };
}

async function embed() {
    const router = require('../server/views.js');
    await new Promise((resolve) => { setTimeout(resolve, 500); });
    const route = router.stack.find((layer) => layer.route && layer.route.path === '/e/:id' && layer.route.methods.get);
    let body = null;
    await new Promise((resolve) => {
        const req = { params: { id: 'ext-1' }, cookies: {}, headers: {}, get() { return ''; } };
        const res = {
            setHeader() {}, set() {}, type() { return this; },
            status() { return this; },
            send(data) { body = data; resolve(); },
        };
        route.route.stack[0].handle(req, res);
    });
    return unescape(body);
}

(async () => {
    flags = { worn: true, consumable: false, star: 2 };
    publish();
    const html = await embed();

    assert.ok(!html.includes('lpSprite'), 'no element asks for the sprite image any more');

    // Item 1 is worn (solid) and not consumable (outline); item 2 is consumable (solid).
    const wornIcons = [...html.matchAll(/<i class="lpWorn[^"]*"[^>]*>(<svg[^>]*>)/g)].map((m) => m[1]);
    const consumableIcons = [...html.matchAll(/<i class="lpConsumable[^"]*"[^>]*>(<svg[^>]*>)/g)].map((m) => m[1]);
    assert.strictEqual(wornIcons.length, 2, 'every row has a worn icon');
    assert.strictEqual(consumableIcons.length, 2, 'every row has a consumable icon');
    assert.ok(wornIcons.some((svg) => svg.includes('fill="currentColor"')), 'a worn item has the solid shirt');
    assert.ok(wornIcons.some((svg) => svg.includes('fill="none"')), 'an item that is not worn has the outline shirt');
    assert.ok(consumableIcons.some((svg) => svg.includes('fill="currentColor"')), 'a consumable item has the solid utensils');
    assert.ok(consumableIcons.some((svg) => svg.includes('fill="none"')), 'an item that is not consumable has the outline utensils');
    assert.ok(html.includes('class="lpWorn lpActive'), 'the worn item is marked active (green)');

    // The rating keeps its class, the stars come from the style sheet.
    assert.ok(/<i class="lpStar lpStar2/.test(html), 'a rated item carries its star class, not a sprite');

    // The unit arrow is an SVG chevron.
    assert.ok(/<i class="lpGlyph lpExpand"><svg[^>]*>/.test(html), 'the unit arrow is an inline SVG');

    console.log('unit-legacy-share-icons OK');
})().catch((err) => { console.error(err); process.exit(1); });
