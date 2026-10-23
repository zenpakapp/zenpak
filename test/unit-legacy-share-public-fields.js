/**
 * Unit test: the legacy share and embed pages show price, images and links only when the list's
 * own share settings (publicFields) allow it, and a category colour cannot add CSS to the page.
 * Run with: node test/unit-legacy-share-public-fields.js
 */

'use strict';

const assert = require('assert');

let fields = {};
function fixtureUser() {
    return {
        _id: 'user-1',
        library: {
            version: '0.3',
            itemUnit: 'g',
            totalUnit: 'g',
            optionalFields: { worn: true, consumable: true, price: true, images: true },
            lists: [{
                id: 'list-1',
                externalId: 'ext-1',
                name: 'Test list',
                visibility: 'shareable',
                categoryIds: ['cat-1'],
                publicFields: fields,
            }],
            categories: [{
                id: 'cat-1',
                name: 'Category',
                color: { r: 0, g: 0, b: '0);x-injected:1;background-image:url(https://evil.example/p.png);x:(0' },
                categoryItems: [{ itemId: 'item-1', qty: 1, worn: false, consumable: false, star: 0 }],
            }],
            items: [{
                id: 'item-1',
                name: 'Tent',
                weight: 900000,
                price: 4321,
                url: 'https://shop.example/tent',
                imageUrl: 'https://img.example/tent.jpg',
            }],
        },
    };
}

let publishedSnapshot = null;
// The db.js stub must be installed before list-versions.js is first required.
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
const colorUtils = require('../client/utils/color.js');

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
    // The templates are read from disk when the module loads: wait until they are there.
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
    // The rendered list is escape()d into the embed script.
    return unescape(body);
}

(async () => {
    // Nothing is allowed: no price, no image, no link, whatever the owner's editor toggles say.
    fields = {};
    publish();
    let html = await embed();
    assert.ok(html.includes('Tent'), 'the item is still listed');
    assert.ok(!html.includes('lpPriceCell'), 'no price column when publicFields.price is off');
    assert.ok(!html.includes('43.21'), 'no price value when publicFields.price is off');
    assert.ok(!html.includes('class="lpItemImage"'), 'no image when publicFields.images is off');
    assert.ok(!html.includes('https://img.example/tent.jpg'), 'no image address when publicFields.images is off');
    assert.ok(!html.includes('class="lpHref"'), 'no link when publicFields.links is off');

    // Everything allowed: the page shows them.
    fields = { price: true, images: true, links: true };
    publish();
    html = await embed();
    assert.ok(html.includes('lpPriceCell'), 'price column when publicFields.price is on');
    assert.ok(html.includes('class="lpItemImage"'), 'image when publicFields.images is on');
    assert.ok(html.includes('class="lpHref"'), 'link when publicFields.links is on');

    // Allowed by the list but hidden by the owner's editor toggles: still hidden.
    fields = { price: true, images: true, links: true };
    const original = fixtureUser;
    publish();
    publishedSnapshot.library.optionalFields = { price: false, images: false };
    html = await embed();
    assert.ok(!html.includes('lpPriceCell'), 'the owner display toggle still hides the price');
    assert.ok(!html.includes('class="lpItemImage"'), 'the owner display toggle still hides the images');
    assert.ok(original);

    // A category colour is forced to numbers, so it cannot add CSS declarations.
    fields = { price: true, images: true, links: true };
    publish();
    html = await embed();
    // The chart data keeps the raw value as data for the canvas; the style attribute must not.
    const legendStyles = [...html.matchAll(/class="lpLegend" style="([^"]*)"/g)].map((m) => m[1]);
    assert.ok(legendStyles.length > 0, 'the totals legend is rendered');
    legendStyles.forEach((style) => {
        assert.strictEqual(style, 'background-color: rgb(0,0,0)', 'the colour falls back to a safe number, with no injected declaration');
    });

    assert.strictEqual(colorUtils.rgbToString({ r: 10, g: 20, b: 30 }), 'rgb(10,20,30)');
    assert.strictEqual(colorUtils.rgbToString({ r: '12', g: 300, b: -5 }), 'rgb(12,255,0)');
    assert.strictEqual(colorUtils.rgbToString({ r: 1, g: 2, b: '3);x:(' }), 'rgb(1,2,3)');
    assert.strictEqual(colorUtils.rgbToString({ r: 1, g: 2, b: 'x' }), 'rgb(1,2,0)');

    console.log('unit-legacy-share-public-fields OK');
})().catch((err) => { console.error(err); process.exit(1); });
