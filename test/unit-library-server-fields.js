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

// A list taken down stays private and flagged whatever the client sends; lifting it frees it.
library = { lists: [{ id: 5, visibility: 'discoverable' }, { id: 6, visibility: 'unlisted', takenDown: true }] };
pinServerOwnedFields(library, { lists: [{ id: 5, takenDown: true, visibility: 'private' }] });
assert.strictEqual(library.lists[0].visibility, 'private', 'the owner cannot republish');
assert.strictEqual(library.lists[0].takenDown, true);
assert.strictEqual(library.lists[1].takenDown, undefined, 'the client cannot flag its own list');
assert.strictEqual(library.lists[1].visibility, 'unlisted');
library = { lists: [{ id: 5, visibility: 'discoverable' }] };
pinServerOwnedFields(library, { lists: [{ id: 5, visibility: 'private' }] });
assert.strictEqual(library.lists[0].visibility, 'discoverable', 'once lifted, publishing works');

// The lock follows externalId too: a new client-chosen id does not free a taken-down list, and
// neither does a duplicate entry carrying the same externalId.
library = {
    lists: [
        { id: 99, externalId: 'abc', visibility: 'discoverable' },
        { id: 100, externalId: 'abc', visibility: 'unlisted' },
        { id: 101, externalId: 'other', visibility: 'unlisted' },
    ],
};
pinServerOwnedFields(library, { lists: [{ id: 5, externalId: 'abc', takenDown: true, visibility: 'private' }] });
assert.strictEqual(library.lists[0].visibility, 'private', 'a changed id does not free the list');
assert.strictEqual(library.lists[0].takenDown, true);
assert.strictEqual(library.lists[1].visibility, 'private', 'a duplicate externalId is locked too');
assert.strictEqual(library.lists[2].visibility, 'unlisted', 'other lists are untouched');
library = { lists: [{ id: 99, externalId: 'abc', featured: true }] };
pinServerOwnedFields(library, { lists: [{ id: 5, externalId: 'abc', featured: true }] });
assert.strictEqual(library.lists[0].featured, true, 'featured follows externalId as well');

// A public id is made by the server (lowercase letters and digits). A client cannot bring its own
// characters into page addresses or into the script of the embed page.
const { isValidExternalId } = require('../server/library-server-fields.js');

['a1b2c3', 'abc', 'x'.repeat(32), '0'].forEach((id) => assert.ok(isValidExternalId(id), `${id} is a valid public id`));
['', 'a;b', 'a b', 'a=0;alert(1);var b', 'a(b)', 'A1B2', 'a-b', 'a_b', 'a/b', 'a"b', 'x'.repeat(33), 5, null, {}, ['a']]
    .forEach((id) => assert.ok(!isValidExternalId(id), `${JSON.stringify(id)} is not a valid public id`));

library = {
    lists: [
        { id: 1, externalId: 'abc123', name: 'kept' },
        { id: 2, externalId: 'a=0;alert(1);var b', name: 'hostile' },
        { id: 3, externalId: { $ne: null }, name: 'operator' },
        { id: 4, name: 'none yet' },
    ],
};
pinServerOwnedFields(library, null);
assert.strictEqual(library.lists[0].externalId, 'abc123', 'a server-made id is kept');
assert.ok(!('externalId' in library.lists[1]), 'an id with script characters is dropped');
assert.ok(!('externalId' in library.lists[2]), 'an id that is not a string is dropped');
assert.ok(!('externalId' in library.lists[3]), 'a list without an id stays without');

// A library without lists is fine.
assert.doesNotThrow(() => pinServerOwnedFields({}, stored));

console.log('unit-library-server-fields: ok');
