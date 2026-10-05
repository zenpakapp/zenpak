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
    assert('success: commit then save, no reload, no notify', ok.calls.join() === 'commit:applyForkUpdate,dispatch:saveNow' && ok.alerts.length === 0);

    const saveFail = harness(['saveNow']);
    await commitAndSave(saveFail.deps, { listId: 1 });
    assert('save failure: loadRemote dispatched', saveFail.calls.includes('dispatch:loadRemote'));
    assert('save failure: notify with update-error key', saveFail.alerts.length === 1 && saveFail.alerts[0].key === 'list.versioning.updateError');

    const both = harness(['saveNow', 'loadRemote']);
    await commitAndSave(both.deps, { listId: 1 });
    assert('loadRemote failure: notify still called, no throw', both.alerts.length === 1 && both.alerts[0].key === 'list.versioning.updateError');

    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
})();
