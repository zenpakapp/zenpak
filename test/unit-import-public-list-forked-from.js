// test/unit-import-public-list-forked-from.js
'use strict';

const { Library } = require('../client/models/library.js');
const mutations = require('../client/store/mutations-import.js');

let passed = 0; let failed = 0;
function assert(desc, cond) {
    if (cond) { console.log(`  PASS  ${desc}`); passed++; }
    else { console.error(`  FAIL  ${desc}`); failed++; }
}

function run() {
    const forkedFrom = {
        externalId: 'gr34-summer',
        ownerId: '507f1f77bcf86cd799439011',
        ownerUsername: 'fx',
        ownerName: 'FX Bénard',
        listName: 'GR34 Summer',
        copiedAt: '2026-07-16T21:00:00.000Z',
    };

    const state = { library: new Library(), globalAlerts: [] };
    mutations.importPublicList(state, {
        listName: 'GR34 Summer',
        description: 'A great trail.',
        categories: [],
        forkedFrom,
    });
    const newList = state.library.lists[state.library.lists.length - 1];
    assert('new list created', Boolean(newList));
    assert('new list is named "Copy of ..."', newList.name === 'Copy of GR34 Summer');
    assert('forkedFrom assigned on new list', JSON.stringify(newList.forkedFrom) === JSON.stringify(forkedFrom));

    // Defensive: payload without forkedFrom (e.g. stale client/server mismatch) must not crash.
    const state2 = { library: new Library(), globalAlerts: [] };
    mutations.importPublicList(state2, { listName: 'No Fork', description: '', categories: [] });
    const newList2 = state2.library.lists[state2.library.lists.length - 1];
    assert('forkedFrom defaults to null when payload omits it', newList2.forkedFrom === null);

    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}
run();
