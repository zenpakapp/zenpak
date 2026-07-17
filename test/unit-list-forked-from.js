// test/unit-list-forked-from.js
'use strict';

const { List } = require('../client/models/list.js');

let passed = 0; let failed = 0;
function assert(desc, cond) {
    if (cond) { console.log(`  PASS  ${desc}`); passed++; }
    else { console.error(`  FAIL  ${desc}`); failed++; }
}

function run() {
    const list = new List({ id: 1, library: null });
    assert('forkedFrom defaults to null', list.forkedFrom === null);

    const saved = list.save();
    assert('save() output has forkedFrom key', 'forkedFrom' in saved);
    assert('save() output forkedFrom is null by default', saved.forkedFrom === null);

    const forkedFrom = {
        externalId: 'gr34-summer',
        ownerId: '507f1f77bcf86cd799439011',
        ownerUsername: 'fx',
        ownerName: 'FX Bénard',
        listName: 'GR34 Summer',
        copiedAt: '2026-07-16T21:00:00.000Z',
    };
    list.forkedFrom = forkedFrom;
    const savedWithFork = list.save();
    assert('save() preserves forkedFrom object', JSON.stringify(savedWithFork.forkedFrom) === JSON.stringify(forkedFrom));

    const reloaded = new List({ id: 2, library: null });
    reloaded.load(savedWithFork);
    assert('load() restores forkedFrom', JSON.stringify(reloaded.forkedFrom) === JSON.stringify(forkedFrom));

    // Old saved lists predate this field entirely — input JSON has no forkedFrom key at all.
    const legacyList = new List({ id: 3, library: null });
    legacyList.load({ id: 3, name: 'Legacy List', categoryIds: [] });
    assert('legacy list with no forkedFrom key in saved JSON stays null', legacyList.forkedFrom === null);

    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}
run();
