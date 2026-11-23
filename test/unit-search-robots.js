'use strict';

const assert = require('node:assert/strict');
const { once } = require('node:events');
const { test } = require('node:test');
const express = require('express');
const { ObjectId } = require('mongodb');

process.env.INDEXING_DELAY_DAYS = '7';

const externalId = 'published-trip';
const username = 'alice';
const dayMs = 24 * 60 * 60 * 1000;
let owner;
let snapshot;
let ownerReads;
let databaseUnavailable = false;

require.cache[require.resolve('../server/db.js')] = {
    exports: {
        users: {
            async findOne(query) {
                ownerReads += 1;
                if (databaseUnavailable) throw new Error('Database unavailable');
                return query.username === username || owner._id.equals(query._id) ? owner : null;
            },
        },
        listVersions: {
            async findSorted(query) {
                return snapshot && query.externalId === externalId ? [snapshot] : [];
            },
        },
        publicListStats: null,
    },
};

const { buildFrozenLibrary } = require('../server/list-versions.js');
const views = require('../server/views.js');

function publish({ days, visibility = 'indexable' }) {
    owner = {
        _id: ObjectId.createFromTime(Math.floor((Date.now() - days * dayMs) / 1000)),
        username,
        library: {
            version: '0.3',
            itemUnit: 'g',
            totalUnit: 'g',
            publicProfile: { visibility },
            lists: [{
                id: 1, externalId, name: 'Published trip', visibility, categoryIds: [], publicFields: { downloadable: true },
            }],
            categories: [],
            items: [],
        },
    };
    snapshot = { ownerId: owner._id, version: 1, library: buildFrozenLibrary(owner.library, externalId) };
}

test('public routes apply the account age and current visibility in the HTTP response', async (t) => {
    const app = express();
    app.use(views);
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    t.after(() => new Promise((resolve) => server.close(resolve)));
    const origin = `http://127.0.0.1:${server.address().port}`;

    async function expectRobots(path, status, header, reads) {
        ownerReads = 0;
        const response = await fetch(`${origin}${path}`);
        await response.text();
        assert.equal(response.status, status, path);
        assert.equal(response.headers.get('x-robots-tag'), header, path);
        assert.equal(ownerReads, reads, `${path} needs only one owner lookup`);
    }

    const paths = [`/p/${externalId}`, `/r/${externalId}`, `/e/${externalId}`, `/csv/${externalId}`, `/u/${username}`];

    publish({ days: 6 });
    for (const path of paths) await expectRobots(path, 200, 'noindex', 1);

    // At the age threshold the same choice becomes indexable without republishing.
    publish({ days: 7 });
    for (const path of paths) await expectRobots(path, 200, null, 1);

    // A live visibility change takes effect even when the frozen version was indexable.
    owner.library.lists[0].visibility = 'shareable';
    owner.library.publicProfile.visibility = 'discoverable';
    for (const path of paths) await expectRobots(path, 200, 'noindex', 1);

    owner.library.lists[0].visibility = 'private';
    await expectRobots(`/p/${externalId}`, 200, 'noindex', 1);
    await expectRobots(`/r/${externalId}`, 400, 'noindex', 1);
    await expectRobots('/p/unpublished', 200, 'noindex', 0);
    await expectRobots('/u/unknown', 200, 'noindex', 1);

    databaseUnavailable = true;
    await expectRobots(`/p/${externalId}`, 200, 'noindex', 1);
    await expectRobots(`/r/${externalId}`, 500, 'noindex', 1);
});
