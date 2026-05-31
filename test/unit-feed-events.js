/**
 * Unit tests: feed-events helper
 * Run with: node test/unit-feed-events.js
 *
 * Uses in-memory stubs for db.feedEvents — no MongoDB connection required.
 */

'use strict';

const { ObjectId } = require('mongodb');

// ---------------------------------------------------------------------------
// Minimal stubs — replace db module before requiring feed-events
// ---------------------------------------------------------------------------

const savedDocs = [];
let stubbedRows = [];

const dbStub = {
    feedEvents: {
        save(doc) {
            savedDocs.push({ ...doc });
            return Promise.resolve(doc);
        },
        findSorted(query, sort, limit) {
            return Promise.resolve(stubbedRows.slice(0, limit));
        },
    },
};

// Inject stub BEFORE loading the module under test
require.cache[require.resolve('../server/db.js')] = { exports: dbStub, id: require.resolve('../server/db.js'), filename: require.resolve('../server/db.js'), loaded: true, children: [], paths: [] };

const { emitFeedEvent, getFeedForUser } = require('../server/feed-events.js');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function assert(description, condition) {
    if (condition) {
        console.log(`  PASS  ${description}`);
        passed++;
    } else {
        console.error(`  FAIL  ${description}`);
        failed++;
    }
}

async function run() {

    // -----------------------------------------------------------------------
    console.log('\n--- emitFeedEvent: valid types ---');
    // -----------------------------------------------------------------------

    savedDocs.length = 0;

    await emitFeedEvent('aaaaaaaaaaaaaaaaaaaaaaaa', 'list.published', 'bbbbbbbbbbbbbbbbbbbbbbbb');
    assert('saves one document for list.published', savedDocs.length === 1);
    assert('userId is an ObjectId', savedDocs[0].userId instanceof ObjectId);
    assert('listId is an ObjectId', savedDocs[0].listId instanceof ObjectId);
    assert('type is preserved', savedDocs[0].type === 'list.published');
    assert('createdAt is a Date', savedDocs[0].createdAt instanceof Date);

    savedDocs.length = 0;
    await emitFeedEvent('aaaaaaaaaaaaaaaaaaaaaaaa', 'list.updated', 'bbbbbbbbbbbbbbbbbbbbbbbb');
    assert('saves one document for list.updated', savedDocs.length === 1);

    savedDocs.length = 0;
    await emitFeedEvent('aaaaaaaaaaaaaaaaaaaaaaaa', 'list.made-public', 'bbbbbbbbbbbbbbbbbbbbbbbb');
    assert('saves one document for list.made-public', savedDocs.length === 1);

    // -----------------------------------------------------------------------
    console.log('\n--- emitFeedEvent: invalid type is silently ignored ---');
    // -----------------------------------------------------------------------

    savedDocs.length = 0;
    await emitFeedEvent('aaaaaaaaaaaaaaaaaaaaaaaa', 'list.deleted', 'bbbbbbbbbbbbbbbbbbbbbbbb');
    assert('does not save for unknown type', savedDocs.length === 0);

    // -----------------------------------------------------------------------
    console.log('\n--- emitFeedEvent: ObjectId passthrough ---');
    // -----------------------------------------------------------------------

    savedDocs.length = 0;
    const uid = new ObjectId();
    const lid = new ObjectId();
    await emitFeedEvent(uid, 'list.published', lid);
    assert('accepts ObjectId directly for userId', savedDocs[0].userId === uid);
    assert('accepts ObjectId directly for listId', savedDocs[0].listId === lid);

    // -----------------------------------------------------------------------
    console.log('\n--- getFeedForUser: empty followedIds ---');
    // -----------------------------------------------------------------------

    const empty = await getFeedForUser([], new Map(), null);
    assert('returns empty events array', Array.isArray(empty.events) && empty.events.length === 0);
    assert('returns null nextCursor', empty.nextCursor === null);

    // -----------------------------------------------------------------------
    console.log('\n--- getFeedForUser: pagination — no next page ---');
    // -----------------------------------------------------------------------

    const id1 = new ObjectId();
    const modes = new Map([[id1.toString(), 'all']]);

    // Stub 3 rows, limit 20 → no next page
    stubbedRows = [
        { createdAt: new Date('2026-01-03T00:00:00Z') },
        { createdAt: new Date('2026-01-02T00:00:00Z') },
        { createdAt: new Date('2026-01-01T00:00:00Z') },
    ];

    const page1 = await getFeedForUser([id1], modes, null, 20);
    assert('returns all 3 events when under limit', page1.events.length === 3);
    assert('nextCursor is null when no more pages', page1.nextCursor === null);

    // -----------------------------------------------------------------------
    console.log('\n--- getFeedForUser: pagination — has next page ---');
    // -----------------------------------------------------------------------

    // Stub limit+1 rows so the function detects a next page
    stubbedRows = [
        { createdAt: new Date('2026-01-03T00:00:00Z') },
        { createdAt: new Date('2026-01-02T00:00:00Z') },
        { createdAt: new Date('2026-01-01T00:00:00Z') },
    ];

    // limit = 2 → fetches 3, detects more, returns 2 + cursor
    const page2 = await getFeedForUser([id1], modes, null, 2);
    assert('returns exactly limit events', page2.events.length === 2);
    assert('nextCursor is ISO string of last event', page2.nextCursor === '2026-01-02T00:00:00.000Z');

    // -----------------------------------------------------------------------
    console.log('\n--- getFeedForUser: cursor filtering ---');
    // -----------------------------------------------------------------------

    // When cursor is provided, it should be added to query as createdAt.$lt
    // We verify this indirectly: stub findSorted to capture the query
    let capturedQuery = null;
    dbStub.feedEvents.findSorted = (query, sort, limit) => {
        capturedQuery = query;
        return Promise.resolve([]);
    };

    const cursor = '2026-01-02T00:00:00.000Z';
    await getFeedForUser([id1], modes, cursor, 20);
    assert('query includes createdAt.$lt when cursor provided', capturedQuery && capturedQuery.createdAt && capturedQuery.createdAt.$lt instanceof Date);
    assert('cursor date value is correct', capturedQuery.createdAt.$lt.toISOString() === cursor);

    // -----------------------------------------------------------------------
    console.log('\n--- getFeedForUser: mode filtering ---');
    // -----------------------------------------------------------------------

    // Restore findSorted stub
    dbStub.feedEvents.findSorted = (query, sort, limit) => {
        capturedQuery = query;
        return Promise.resolve([]);
    };

    const id2 = new ObjectId();
    const mixedModes = new Map([
        [id1.toString(), 'all'],
        [id2.toString(), 'new-only'],
    ]);

    await getFeedForUser([id1, id2], mixedModes, null, 20);

    const orClauses = capturedQuery.$or;
    assert('$or has two clauses', orClauses && orClauses.length === 2);

    const allClause = orClauses.find((c) => c.userId.toString() === id1.toString());
    const newOnlyClause = orClauses.find((c) => c.userId.toString() === id2.toString());

    assert('all mode includes list.updated', allClause && allClause.type.$in.includes('list.updated'));
    assert('new-only mode excludes list.updated', newOnlyClause && !newOnlyClause.type.$in.includes('list.updated'));
    assert('new-only mode includes list.published', newOnlyClause && newOnlyClause.type.$in.includes('list.published'));
    assert('new-only mode includes list.made-public', newOnlyClause && newOnlyClause.type.$in.includes('list.made-public'));

    // -----------------------------------------------------------------------
    console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
    process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
    console.error('Unexpected error:', err);
    process.exit(1);
});
