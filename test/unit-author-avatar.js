/**
 * Unit test: the author's photo is shown beside their name on Discover cards and on the public list
 * page, but only when the profile is public. A private profile keeps its photo to itself.
 * Run with: node test/unit-author-avatar.js
 */

'use strict';

const assert = require('assert');
const { buildOwnerUser, stubServerModule } = require('./fixtures/list-versions-fixtures.js');

stubServerModule('db.js', { publicListStats: { findOne: () => Promise.resolve(null) } });

const { buildPublicList } = require('../server/public-sharing.js');
const { buildPublicListProjection, projectionToDiscoverItem } = require('../server/public-list-projections.js');

const PHOTO = 'https://res.cloudinary.com/demo/image/upload/v1/lighterpack/avatars/me.png';
const owner = buildOwnerUser();
const list = owner.library.lists[0];
owner.library.publicProfile = { displayName: 'Alice', avatarUrl: PHOTO, visibility: 'discoverable' };

// A public profile: the photo reaches the page and the Discover card.
assert.strictEqual(buildPublicList(owner, 'abc123').authorAvatarUrl, PHOTO, 'the public list page carries it');
const projection = buildPublicListProjection(owner, list, {}, null);
assert.strictEqual(projection.ownerAvatarUrl, PHOTO);
assert.strictEqual(projectionToDiscoverItem(projection).authorAvatarUrl, PHOTO, 'the Discover card carries it');

// A private profile: no photo anywhere, the name is still shown.
owner.library.publicProfile.visibility = 'private';
assert.strictEqual(buildPublicList(owner, 'abc123').authorAvatarUrl, '');
const privateProjection = buildPublicListProjection(owner, list, {}, null);
assert.strictEqual(privateProjection.ownerAvatarUrl, '');
assert.strictEqual(projectionToDiscoverItem(privateProjection).authorAvatarUrl, '');
assert.strictEqual(projectionToDiscoverItem(privateProjection).authorDisplayName, 'Alice');

// No photo at all, and a projection saved before this field existed.
owner.library.publicProfile = { displayName: 'Alice', visibility: 'discoverable' };
assert.strictEqual(buildPublicList(owner, 'abc123').authorAvatarUrl, '');
assert.strictEqual(projectionToDiscoverItem({ externalId: 'x', name: 'Old' }).authorAvatarUrl, '');

console.log('unit-author-avatar OK');
process.exit(0);
