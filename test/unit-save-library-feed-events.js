/**
 * Unit tests: feed-event emission on visibility change in saveLibrary
 * Run with: node test/unit-save-library-feed-events.js
 *
 * Tests the visibility-change detection logic extracted from saveLibrary.
 * Uses in-memory stubs — no MongoDB, no HTTP required.
 */

'use strict';

// ---------------------------------------------------------------------------
// Stubs
// ---------------------------------------------------------------------------

const emittedEvents = [];

const feedEventsStub = {
    emitFeedEvent(userId, type, listId) {
        emittedEvents.push({ userId, type, listId });
        return Promise.resolve();
    },
};

// Inject stubs BEFORE loading the module under test
require.cache[require.resolve('../server/db.js')] = {
    exports: { users: { save: () => {} }, feedEvents: { save: () => Promise.resolve() } },
    id: require.resolve('../server/db.js'),
    filename: require.resolve('../server/db.js'),
    loaded: true,
    children: [],
    paths: [],
};

require.cache[require.resolve('../server/feed-events.js')] = {
    exports: feedEventsStub,
    id: require.resolve('../server/feed-events.js'),
    filename: require.resolve('../server/feed-events.js'),
    loaded: true,
    children: [],
    paths: [],
};

// We also need to stub mailgun and other heavy server deps
require.cache[require.resolve('../server/mailgun.js')] = {
    exports: { sendMail: () => Promise.resolve() },
    id: require.resolve('../server/mailgun.js'),
    filename: require.resolve('../server/mailgun.js'),
    loaded: true,
    children: [],
    paths: [],
};

// Load the logic under test
const { detectVisibilityChanges } = require('../server/save-library-feed.js');

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
    const USER_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';

    // -----------------------------------------------------------------------
    console.log('\n--- private → shareable: emits list.made-public ---');
    // -----------------------------------------------------------------------

    emittedEvents.length = 0;
    const oldLists1 = [{ id: '1', name: 'My List', visibility: 'private' }];
    const newLists1 = [{ id: '1', name: 'My List', visibility: 'shareable' }];
    await detectVisibilityChanges(USER_ID, oldLists1, newLists1);
    assert('emits exactly one event', emittedEvents.length === 1);
    assert('type is list.made-public', emittedEvents[0].type === 'list.made-public');
    assert('listId is correct', emittedEvents[0].listId === '1');
    assert('userId is correct', emittedEvents[0].userId === USER_ID);

    // -----------------------------------------------------------------------
    console.log('\n--- new list created already public: emits list.published ---');
    // -----------------------------------------------------------------------

    emittedEvents.length = 0;
    const oldLists2 = [];
    const newLists2 = [{ id: '2', name: 'Brand New', visibility: 'shareable' }];
    await detectVisibilityChanges(USER_ID, oldLists2, newLists2);
    assert('emits exactly one event', emittedEvents.length === 1);
    assert('type is list.published', emittedEvents[0].type === 'list.published');
    assert('listId is correct', emittedEvents[0].listId === '2');

    // -----------------------------------------------------------------------
    console.log('\n--- private → private: no event ---');
    // -----------------------------------------------------------------------

    emittedEvents.length = 0;
    const oldLists3 = [{ id: '3', name: 'Hidden', visibility: 'private' }];
    const newLists3 = [{ id: '3', name: 'Hidden', visibility: 'private' }];
    await detectVisibilityChanges(USER_ID, oldLists3, newLists3);
    assert('no event emitted', emittedEvents.length === 0);

    // -----------------------------------------------------------------------
    console.log('\n--- public → private: no event ---');
    // -----------------------------------------------------------------------

    emittedEvents.length = 0;
    const oldLists4 = [{ id: '4', name: 'Was Public', visibility: 'shareable' }];
    const newLists4 = [{ id: '4', name: 'Was Public', visibility: 'private' }];
    await detectVisibilityChanges(USER_ID, oldLists4, newLists4);
    assert('no event emitted when list made private', emittedEvents.length === 0);

    // -----------------------------------------------------------------------
    console.log('\n--- public → public, name changed: emits list.updated ---');
    // -----------------------------------------------------------------------

    emittedEvents.length = 0;
    const oldLists5 = [{ id: '5', name: 'Old Name', visibility: 'shareable' }];
    const newLists5 = [{ id: '5', name: 'New Name', visibility: 'shareable' }];
    await detectVisibilityChanges(USER_ID, oldLists5, newLists5);
    assert('emits exactly one event', emittedEvents.length === 1);
    assert('type is list.updated', emittedEvents[0].type === 'list.updated');
    assert('listId is correct', emittedEvents[0].listId === '5');

    // -----------------------------------------------------------------------
    console.log('\n--- public → public, name unchanged: no event ---');
    // -----------------------------------------------------------------------

    emittedEvents.length = 0;
    const oldLists6 = [{ id: '6', name: 'Same Name', visibility: 'shareable' }];
    const newLists6 = [{ id: '6', name: 'Same Name', visibility: 'shareable' }];
    await detectVisibilityChanges(USER_ID, oldLists6, newLists6);
    assert('no event when name unchanged', emittedEvents.length === 0);

    // -----------------------------------------------------------------------
    console.log('\n--- undefined old visibility treated as private ---');
    // -----------------------------------------------------------------------

    emittedEvents.length = 0;
    // List existed but had no visibility field (legacy)
    const oldLists7 = [{ id: '7', name: 'Legacy' }];
    const newLists7 = [{ id: '7', name: 'Legacy', visibility: 'discoverable' }];
    await detectVisibilityChanges(USER_ID, oldLists7, newLists7);
    assert('emits list.made-public for legacy list gaining visibility', emittedEvents.length === 1);
    assert('type is list.made-public (was not new list)', emittedEvents[0].type === 'list.made-public');

    // -----------------------------------------------------------------------
    console.log('\n--- multiple lists: only changed ones emit ---');
    // -----------------------------------------------------------------------

    emittedEvents.length = 0;
    const oldLists8 = [
        { id: '8a', name: 'A', visibility: 'private' },
        { id: '8b', name: 'B', visibility: 'shareable' },
        { id: '8c', name: 'C', visibility: 'private' },
    ];
    const newLists8 = [
        { id: '8a', name: 'A', visibility: 'private' },    // unchanged
        { id: '8b', name: 'B', visibility: 'shareable' },  // unchanged
        { id: '8c', name: 'C', visibility: 'shareable' },  // private → public
    ];
    await detectVisibilityChanges(USER_ID, oldLists8, newLists8);
    assert('emits exactly one event for multi-list save', emittedEvents.length === 1);
    assert('correct list triggered', emittedEvents[0].listId === '8c');
    assert('type is list.made-public', emittedEvents[0].type === 'list.made-public');

    // -----------------------------------------------------------------------
    console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
    process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
    console.error('Unexpected error:', err);
    process.exit(1);
});
