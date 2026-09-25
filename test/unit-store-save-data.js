'use strict';

/**
 * Unit test: store save data should reuse prepared snapshots.
 * Run with: node test/unit-store-save-data.js
 */

const { getSaveData } = require('../client/services/save-data.js');

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

console.log('\n--- Store save data ---');

{
    let saveCount = 0;
    const state = {
        library: {
            save() {
                saveCount++;
                return { ok: true };
            },
        },
    };

    assert('uses prepared save data unchanged', getSaveData(state, '{"cached":true}') === '{"cached":true}');
    assert('skips library serialization when prepared data is provided', saveCount === 0);
}

{
    let saveCount = 0;
    const state = {
        library: {
            save() {
                saveCount++;
                return { ok: true };
            },
        },
    };

    assert('serializes library when no prepared data is provided', getSaveData(state) === '{"ok":true}');
    assert('calls library save once without prepared data', saveCount === 1);
}

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
