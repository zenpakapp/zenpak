/**
 * Unit test: getDeletedForkSources lists the sources of an account's copies whose author has deleted
 * their account, so the copy can say its source is gone instead of linking to a page that cannot open.
 * Copies of an author who still exists, and lists that were not copied, are never reported.
 * Run with: node test/unit-deleted-fork-sources.js
 */

'use strict';

const assert = require('assert');
const { ObjectId } = require('mongodb');
const { stubServerModule } = require('./fixtures/list-versions-fixtures.js');

const alive = new ObjectId();
const gone = new ObjectId();
let asked = null;
stubServerModule('db.js', {
    users: {
        findMany(query, options) {
            asked = { query, options };
            return Promise.resolve([{ _id: alive }].filter((u) => query._id.$in.some((id) => String(id) === String(u._id))));
        },
    },
});

const { getDeletedForkSources } = require('../server/list-versions.js');

(async () => {
    const user = {
        library: {
            lists: [
                { id: 1, name: 'Mine' },
                { id: 2, forkedFrom: { externalId: 'kept1', ownerId: String(alive) } },
                { id: 3, forkedFrom: { externalId: 'gone1', ownerId: String(gone) } },
                { id: 4, forkedFrom: { externalId: 'gone1', ownerId: String(gone) } },
                { id: 5, forkedFrom: { externalId: 'gone2', ownerId: String(gone) } },
                { id: 6, forkedFrom: { externalId: 'noowner' } },
                { id: 7, forkedFrom: { externalId: 'badowner', ownerId: 'not-an-id' } },
            ],
        },
    };

    assert.deepStrictEqual(
        (await getDeletedForkSources(user)).sort(),
        ['gone1', 'gone2'],
        'only the sources whose author is gone, once each',
    );
    assert.deepStrictEqual(asked.options, { projection: { _id: 1 } }, 'only ids are read');

    // Nothing copied: no query at all.
    asked = null;
    assert.deepStrictEqual(await getDeletedForkSources({ library: { lists: [{ id: 1 }] } }), []);
    assert.deepStrictEqual(await getDeletedForkSources({}), []);
    assert.strictEqual(asked, null, 'no lookup when there is nothing to check');

    console.log('unit-deleted-fork-sources: ok');
    process.exit(0);
})().catch((err) => { console.error(err); process.exit(1); });
