/**
 * Unit test: a client library cannot set the fields the server owns (plan, creator, insights,
 * moderator-set featured), whichever route it comes through.
 * Run with: node test/unit-library-server-fields.js
 */

'use strict';

const assert = require('assert');
const { pinServerOwnedFields } = require('../server/library-server-fields.js');

// New account (register): nothing is stored, so nothing server-owned survives.
let library = {
    entitlements: { plan: 'creator' },
    creator: { slug: 'me' },
    insights: { views: 99 },
    lists: [{ id: 1, featured: true }, { id: 2 }],
    publicProfile: { displayName: 'Me' },
};
pinServerOwnedFields(library, null);
assert.strictEqual(library.entitlements, undefined, 'a self-granted plan is dropped');
assert.strictEqual(library.creator, undefined);
assert.strictEqual(library.insights, undefined);
assert.strictEqual(library.lists[0].featured, undefined, 'a self-featured list is dropped');
assert.deepStrictEqual(library.publicProfile, { displayName: 'Me' }, 'a new account may choose its profile');

// Existing account (restore, saveLibrary): the stored values win.
const stored = {
    entitlements: { plan: 'free' },
    creator: { slug: 'real' },
    insights: { views: 3 },
    publicProfile: { displayName: 'Real' },
    lists: [{ id: 2, featured: true }],
};
library = {
    entitlements: { plan: 'creator' },
    creator: { slug: 'fake' },
    insights: { views: 99 },
    publicProfile: { displayName: 'Fake' },
    lists: [{ id: 1, featured: true }, { id: 2 }],
};
pinServerOwnedFields(library, stored);
assert.deepStrictEqual(library.entitlements, { plan: 'free' });
assert.deepStrictEqual(library.creator, { slug: 'real' });
assert.deepStrictEqual(library.insights, { views: 3 });
assert.deepStrictEqual(library.publicProfile, { displayName: 'Real' });
assert.strictEqual(library.lists[0].featured, undefined, 'the client cannot feature a list');
assert.strictEqual(library.lists[1].featured, true, 'a moderator-set featured stays');
assert.notStrictEqual(library.entitlements, stored.entitlements, 'stored objects are copied');

// A library without lists is fine.
assert.doesNotThrow(() => pinServerOwnedFields({}, stored));

console.log('unit-library-server-fields: ok');
