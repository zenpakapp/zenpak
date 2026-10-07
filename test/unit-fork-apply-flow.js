'use strict';

const { commitAndSave } = require('../client/utils/fork-apply-flow.js');

let passed = 0; let failed = 0;
function assert(desc, cond) {
    if (cond) { console.log(`  PASS  ${desc}`); passed++; }
    else { console.error(`  FAIL  ${desc}`); failed++; }
}

function harness(failing) {
    const calls = []; const alerts = [];
    return {
        calls,
        alerts,
        deps: {
            commit: (name) => calls.push(`commit:${name}`),
            dispatch: async (name) => { calls.push(`dispatch:${name}`); if (failing.includes(name)) throw new Error(name); },
            notify: (alert) => alerts.push(alert),
        },
    };
}

(async () => {
    const ok = harness([]);
    await commitAndSave(ok.deps, { listId: 1 });
    assert('success: save, commit, save, no reload, no notify', ok.calls.join() === 'dispatch:saveNow,commit:applyForkUpdate,dispatch:saveNow' && ok.alerts.length === 0);

    const preFail = harness(['saveNow']);
    await commitAndSave(preFail.deps, { listId: 1 });
    assert('pre-save failure: no commit, no reload', !preFail.calls.some((c) => c.startsWith('commit:') || c === 'dispatch:loadRemote'));
    assert('pre-save failure: notify with update-error key', preFail.alerts.length === 1 && preFail.alerts[0].key === 'list.versioning.updateError');

    // Fails on the second saveNow only (the post-commit one).
    const saveFail = harness([]);
    let saves = 0;
    saveFail.deps.dispatch = async (name) => { saveFail.calls.push(`dispatch:${name}`); if (name === 'saveNow' && (saves += 1) === 2) throw new Error(name); };
    await commitAndSave(saveFail.deps, { listId: 1 });
    assert('save failure: loadRemote dispatched', saveFail.calls.includes('dispatch:loadRemote'));
    assert('save failure: notify with update-error key', saveFail.alerts.length === 1 && saveFail.alerts[0].key === 'list.versioning.updateError');

    const both = harness([]);
    let bothSaves = 0;
    both.deps.dispatch = async (name) => { both.calls.push(`dispatch:${name}`); if (name === 'loadRemote' || (name === 'saveNow' && (bothSaves += 1) === 2)) throw new Error(name); };
    await commitAndSave(both.deps, { listId: 1 });
    assert('loadRemote failure: notify still called, no throw', both.alerts.length === 1 && both.alerts[0].key === 'list.versioning.updateError');

    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
})();
