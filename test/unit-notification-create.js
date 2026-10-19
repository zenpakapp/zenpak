/**
 * Unit test: createNotification stores one notification for the right person, honours their
 * preferences, does not repeat a follow alert within a day, and never throws.
 * Run with: node test/unit-notification-create.js
 */

'use strict';

process.env.NODE_CONFIG = JSON.stringify({
    environment: 'test',
    stripeSecretKey: '',
    stripeWebhookSecret: '',
    kofiWebhookToken: '',
    databaseUrl: 'localhost/test',
    deployUrl: 'http://localhost:3000',
});

const assert = require('assert');
const { ObjectId } = require('mongodb');
const { stubServerModule } = require('./fixtures/list-versions-fixtures.js');

const owner = { _id: new ObjectId(), username: 'alice' };
const quiet = { _id: new ObjectId(), username: 'quiet', notificationPrefs: { follow: false, copy: true } };
const noCopies = { _id: new ObjectId(), username: 'nocopies', notificationPrefs: { follow: true, copy: false } };
const users = [owner, quiet, noCopies];

const stored = [];
let failing = false;
stubServerModule('db.js', {
    users: {
        findOne(query) {
            if (failing) return Promise.reject(new Error('database down'));
            return Promise.resolve(users.find((u) => String(u._id) === String(query._id)) || null);
        },
    },
    notifications: {
        findMany(query) {
            return Promise.resolve(stored.filter((n) => String(n.userId) === String(query.userId)
                && n.type === query.type && n.actorUsername === query.actorUsername));
        },
        save(doc) { stored.push(doc); return Promise.resolve(doc); },
    },
});

const { createNotification } = require('../server/notifications.js');

(async () => {
    // A follow alert is stored for the person followed, with who did it.
    await createNotification({
        userId: owner._id, type: 'follow', actorUsername: 'bob', actorDisplayName: 'Bob Trail', actorTier: 'creator',
    });
    assert.strictEqual(stored.length, 1);
    assert.strictEqual(String(stored[0].userId), String(owner._id));
    assert.strictEqual(stored[0].type, 'follow');
    assert.strictEqual(stored[0].actorUsername, 'bob');
    assert.strictEqual(stored[0].actorDisplayName, 'Bob Trail');
    assert.strictEqual(stored[0].actorTier, 'creator');
    assert.strictEqual(stored[0].read, false, 'it starts unread');
    assert.ok(stored[0].createdAt instanceof Date);

    // With no display name, the username stands in for it.
    await createNotification({
        userId: owner._id, type: 'follow', actorUsername: 'carol', actorDisplayName: '   ',
    });
    assert.strictEqual(stored[1].actorDisplayName, 'carol');

    // The same person following again within a day does not alert again.
    await createNotification({ userId: owner._id, type: 'follow', actorUsername: 'bob', actorDisplayName: 'Bob Trail' });
    assert.strictEqual(stored.length, 2, 'no repeat within a day');
    stored[0].createdAt = new Date(Date.now() - 25 * 60 * 60 * 1000);
    await createNotification({ userId: owner._id, type: 'follow', actorUsername: 'bob', actorDisplayName: 'Bob Trail' });
    assert.strictEqual(stored.length, 3, 'a day later it alerts again');

    // A copy alert names the list. Copies are not deduplicated: each one is news.
    await createNotification({
        userId: owner._id, type: 'copy', actorUsername: 'dave', actorDisplayName: 'Dave', listName: 'PCT Section J',
    });
    await createNotification({
        userId: owner._id, type: 'copy', actorUsername: 'dave', actorDisplayName: 'Dave', listName: 'PCT Section J',
    });
    const copies = stored.filter((n) => n.type === 'copy');
    assert.strictEqual(copies.length, 2);
    assert.strictEqual(copies[0].listName, 'PCT Section J');

    // Preferences: somebody who turned follow alerts off gets none, but still gets copies.
    const before = stored.length;
    await createNotification({ userId: quiet._id, type: 'follow', actorUsername: 'bob', actorDisplayName: 'Bob' });
    assert.strictEqual(stored.length, before, 'follow alerts are off');
    await createNotification({ userId: quiet._id, type: 'copy', actorUsername: 'bob', actorDisplayName: 'Bob', listName: 'L' });
    assert.strictEqual(stored.length, before + 1, 'copy alerts are still on');
    await createNotification({ userId: noCopies._id, type: 'copy', actorUsername: 'bob', actorDisplayName: 'Bob', listName: 'L' });
    assert.strictEqual(stored.length, before + 1, 'copy alerts are off');

    // Nobody to tell, or a database that fails: nothing is stored, and nothing throws.
    await createNotification({ userId: new ObjectId(), type: 'follow', actorUsername: 'bob', actorDisplayName: 'Bob' });
    assert.strictEqual(stored.length, before + 1, 'an unknown account is not alerted');
    failing = true;
    await createNotification({ userId: owner._id, type: 'follow', actorUsername: 'erin', actorDisplayName: 'Erin' });
    failing = false;
    assert.strictEqual(stored.length, before + 1, 'a failure stores nothing, and does not break the follow');

    console.log('unit-notification-create OK');
    process.exit(0);
})().catch((error) => { console.error(error); process.exit(1); });
