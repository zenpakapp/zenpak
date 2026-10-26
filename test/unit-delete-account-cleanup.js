/**
 * Unit test: deleting an account removes what is personal: its Discover entries, follows and feed
 * events, the notifications it received or caused, the record of the copies it made, the view counts
 * of its lists, the reports it filed, and its profile photo at the image host. What the law or
 * moderation keep stays, and so do the copies other accounts made of its lists.
 * Run with: node test/unit-delete-account-cleanup.js
 */

'use strict';

const assert = require('assert');
const { ObjectId } = require('mongodb');
const { stubServerModule } = require('./fixtures/list-versions-fixtures.js');

const calls = [];
const destroyed = [];
const collection = (name) => ({ deleteMany(filter) { calls.push([name, filter]); return Promise.resolve(); } });
const photo = 'https://res.cloudinary.com/demo/image/upload/v1/lighterpack/avatars/eve.png';
const account = {
    _id: new ObjectId(),
    username: 'eve',
    library: { lists: [{ externalId: 'abc123' }, { externalId: 'def456' }, { name: 'never shared' }], publicProfile: { avatarUrl: photo } },
};
stubServerModule('db.js', {
    users: { remove() { calls.push(['users', 'remove']); } },
    publicLists: collection('publicLists'),
    follows: collection('follows'),
    feedEvents: collection('feedEvents'),
    notifications: collection('notifications'),
    listCopies: collection('listCopies'),
    publicListStats: collection('publicListStats'),
    publicListViewers: collection('publicListViewers'),
    reports: collection('reports'),
    billingEvents: collection('billingEvents'),
});
stubServerModule('auth.js', {
    authenticateUser(req, res, next) { next(req, res, account); },
    verifyPassword() { return Promise.resolve(account); },
    generateSession() {},
});
stubServerModule('list-versions.js', { deleteVersionsForOwner: () => Promise.resolve() });
stubServerModule('avatar-storage.js', { destroyAvatar(url) { destroyed.push(url); return Promise.resolve(true); } });

const router = require('../server/account-endpoints.js');

const layer = router.stack.find((l) => l.route && l.route.path === '/delete-account' && l.route.methods.post);
assert.ok(layer, 'POST /delete-account exists');

new Promise((resolve) => {
    const res = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(data) { resolve({ status: this.statusCode, data }); },
    };
    layer.route.stack[0].handle({ body: { password: 'pw', username: 'eve' }, cookies: {} }, res);
}).then((result) => {
    assert.strictEqual(result.status, 200);
    const filters = (name) => calls.filter((c) => c[0] === name).map((c) => c[1]);
    const ownerId = String(account._id);

    assert.strictEqual(String(filters('publicLists')[0].ownerId), ownerId, 'Discover entries removed');
    assert.strictEqual(filters('follows')[0].$or.length, 2, 'follows removed on both sides');
    assert.strictEqual(String(filters('feedEvents')[0].userId), ownerId, 'feed events removed');

    const notification = filters('notifications')[0].$or;
    assert.ok(notification.some((c) => String(c.userId) === ownerId), 'notifications it received are removed');
    assert.ok(notification.some((c) => c.actorUsername === 'eve'), 'notifications that carry its name are removed');

    const copies = filters('listCopies');
    assert.strictEqual(copies.length, 1);
    assert.deepStrictEqual(copies[0], { userId: ownerId }, 'only the record of the copies it made is removed');
    assert.ok(!JSON.stringify(copies[0]).includes('abc123'), 'what others copied from its lists is never touched');
    assert.strictEqual(filters('publicListStats')[0].externalId.$in.join(), 'abc123,def456', 'view counts of its lists removed');
    assert.strictEqual(filters('publicListViewers')[0].externalId.$in.join(), 'abc123,def456', 'viewer records of its lists removed');
    assert.strictEqual(String(filters('reports')[0].reporterId), ownerId, 'reports it filed are removed');
    assert.deepStrictEqual(destroyed, [photo], 'the profile photo is removed at the host');

    assert.strictEqual(filters('billingEvents').length, 0, 'billing events are kept: invoices are kept by law');
    console.log('unit-delete-account-cleanup: ok');
    process.exit(0);
}).catch((err) => { console.error(err); process.exit(1); });
