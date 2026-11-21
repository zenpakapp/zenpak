/**
 * Unit test: only the store keeps the save protocol. A view or component that commits `setLastSaveData`
 * (what was last saved) or `setSyncToken` (the server's token for the next save) has to know how a save
 * works; it should ask a store action to do it. Signing in or registering starts the session, so those
 * two forms may set the first token.
 * Run with: node test/unit-save-protocol-in-store-guard.js
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../client');
const DIRS = ['components', 'views', 'composables'];
const STARTS_A_SESSION = ['components/signin-form.vue', 'components/register-form.vue'];

const PROTOCOL_COMMIT = /commit\(\s*['"](setLastSaveData|setSyncToken)['"]/;

assert.ok(PROTOCOL_COMMIT.test("this.$store.commit('setSyncToken', response.syncToken);"), 'the pattern sees setSyncToken');
assert.ok(PROTOCOL_COMMIT.test('store.commit("setLastSaveData", data)'), 'the pattern sees setLastSaveData');
assert.ok(!PROTOCOL_COMMIT.test("this.$store.commit('setBilling', data);"), 'the pattern leaves other commits alone');

const problems = [];
let files = 0;
DIRS.forEach((dir) => {
    (function walk(d) {
        fs.readdirSync(d, { withFileTypes: true }).forEach((entry) => {
            const full = path.join(d, entry.name);
            if (entry.isDirectory()) return walk(full);
            if (!/\.(js|vue)$/.test(entry.name)) return undefined;
            const rel = path.relative(root, full);
            if (STARTS_A_SESSION.includes(rel)) return undefined;
            files += 1;
            fs.readFileSync(full, 'utf8').split('\n').forEach((line, i) => {
                if (PROTOCOL_COMMIT.test(line)) problems.push(`${rel}:${i + 1}: ${line.trim()}`);
            });
            return undefined;
        });
    }(path.join(root, dir)));
});

assert.deepStrictEqual(problems, [], `\nAsk a store action (client/store/store.js) to save instead:\n${problems.join('\n')}`);
console.log(`unit-save-protocol-in-store-guard: ok (${files} files)`);
