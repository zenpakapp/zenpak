'use strict';

const mutations = require('../client/store/mutations-session.js');

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

function run() {
    const state = { initializationStatus: 'loading' };

    mutations.setInitializationStatus(state, 'ready');
    assert('sets initialization status to ready', state.initializationStatus === 'ready');

    mutations.setInitializationStatus(state, 'error');
    assert('sets initialization status to error', state.initializationStatus === 'error');

    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}

run();
