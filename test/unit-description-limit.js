/**
 * Unit test: a list description is shown to the public (page, Discover) at 1000 characters at
 * most. The text the author saved is not cut: only what is exposed is.
 * Run with: node test/unit-description-limit.js
 */

'use strict';

const assert = require('assert');
const { buildOwnerUser, stubServerModule } = require('./fixtures/list-versions-fixtures.js');

stubServerModule('db.js', { publicListStats: { findOne: () => Promise.resolve(null) } });

const { buildPublicList } = require('../server/public-sharing.js');
const { buildPublicListProjection } = require('../server/public-list-projections.js');

const LIMIT = 1000;
const long = `${'word '.repeat(600)}END`;

const owner = buildOwnerUser();
const list = owner.library.lists[0];
list.description = long;
list.summary = long;

// The public list page.
const publicList = buildPublicList(owner, 'abc123');
assert.ok(publicList, 'the list is public');
assert.strictEqual(publicList.list.description.length, LIMIT);
assert.strictEqual(publicList.list.summary.length, LIMIT);
assert.ok(long.startsWith(publicList.list.description), 'cut at the end, not reworded');

// Discover cards and the search tokens come from the projection.
const projection = buildPublicListProjection(owner, list, {}, null);
assert.strictEqual(projection.description.length, LIMIT);

// What the author saved is untouched.
assert.strictEqual(list.description.length, long.length);

// A short description is left as it is.
list.description = 'A description';
list.summary = '';
assert.strictEqual(buildPublicList(owner, 'abc123').list.description, 'A description');
assert.strictEqual(buildPublicListProjection(owner, list, {}, null).description, 'A description');

// Line breaks: one empty line at most in a row, on every public surface.
list.description = `first${'\n'.repeat(50)}second\r\n\r\n\r\nthird`;
list.summary = '';
assert.strictEqual(buildPublicList(owner, 'abc123').list.description, 'first\n\nsecond\n\nthird');
assert.strictEqual(buildPublicListProjection(owner, list, {}, null).description, 'first\n\nsecond\n\nthird');
// Empty lines do not eat the length either.
list.description = `${'\n'.repeat(500)}${'x'.repeat(2000)}`;
assert.strictEqual(buildPublicList(owner, 'abc123').list.description, 'x'.repeat(1000));

console.log('ok');
