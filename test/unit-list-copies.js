'use strict';

const { createListCopiesStub, stubServerModule } = require('./fixtures/list-versions-fixtures.js');

const listCopiesDb = createListCopiesStub();
stubServerModule('db.js', { listCopies: listCopiesDb });

const { recordCopy, getCopiedVersions, hasCopiedVersion } = require('../server/list-copies.js');

let passed = 0; let failed = 0;
function assert(desc, cond) {
    if (cond) { console.log(`  PASS  ${desc}`); passed++; }
    else { console.error(`  FAIL  ${desc}`); failed++; }
}

async function run() {
    await recordCopy('u1', 'src1', 1);
    await recordCopy('u1', 'src1', 2);
    await recordCopy('u1', 'src1', 2);
    await recordCopy('u1', 'src2', 1);
    await recordCopy('u2', 'src1', 1);
    assert('recording the same copy twice stores one row', listCopiesDb.rows.length === 4);
    assert('a row stores the user as a string', listCopiesDb.rows.every((row) => typeof row.userId === 'string'));

    const copied = await getCopiedVersions('u1', ['src1', 'src2', 'src3']);
    assert('returns every version copied from a list', hasCopiedVersion(copied, 'src1', 1) && hasCopiedVersion(copied, 'src1', 2));
    assert('returns copies from other lists', hasCopiedVersion(copied, 'src2', 1));
    assert('a version never copied is rejected', !hasCopiedVersion(copied, 'src1', 3) && !hasCopiedVersion(copied, 'src2', 2));
    assert('a list never copied is rejected', !hasCopiedVersion(copied, 'src3', 1));
    assert('another user copies do not count', !hasCopiedVersion(await getCopiedVersions('u3', ['src1']), 'src1', 1));
    assert('an id object is matched as a string', hasCopiedVersion(await getCopiedVersions({ toString: () => 'u2' }, ['src1']), 'src1', 1));
    assert('no external ids reads nothing', (await getCopiedVersions('u1', [])).size === 0);

    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => { console.error(err); process.exit(1); });
