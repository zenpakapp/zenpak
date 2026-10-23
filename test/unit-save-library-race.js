/**
 * Unit test: /saveLibrary writes only the library and its sync token, and only if nobody saved
 * since it read the account, so an older read cannot put back a plan, password or session.
 * Run with: node test/unit-save-library-race.js
 */

'use strict';

const assert = require('assert');
const { stubServerModule } = require('./fixtures/list-versions-fixtures.js');

const calls = [];
let matched = 1;
const account = {
    _id: 'u1', username: 'dana', syncToken: 4, emailVerified: true, password: 'hash', token: 'tok', billing: { plan: 'creator' }, library: { lists: [], items: [], categories: [] },
};
stubServerModule('db.js', {
    users: {
        updateOne(filter, update) { calls.push({ filter, update }); return Promise.resolve({ matchedCount: matched }); },
        save() { throw new Error('a whole-document save must not be used'); },
    },
});
stubServerModule('auth.js', { authenticateUser(req, res, next) { next(req, res, account); } });
stubServerModule('public-list-projections.js', { syncUserPublicLists: async () => {} });

const router = require('../server/library-endpoints.js');
const layer = router.stack.find((l) => l.route && l.route.path === '/saveLibrary' && l.route.methods.post);
assert.ok(layer, 'POST /saveLibrary exists');

function save() {
    return new Promise((resolve) => {
        const res = {
            statusCode: 200,
            status(code) { this.statusCode = code; return this; },
            json(data) { resolve({ status: this.statusCode, data }); },
            send(data) { resolve({ status: this.statusCode, data }); },
        };
        const body = { syncToken: 4, username: 'dana', data: JSON.stringify({ lists: [], items: [], categories: [] }) };
        layer.route.stack[0].handle({ body, cookies: {} }, res);
    });
}

(async () => {
    let result = await save();
    assert.strictEqual(result.status, 200);
    assert.deepStrictEqual(calls[0].filter, { _id: 'u1', syncToken: 4 }, 'conditional on the sync token that was read');
    assert.deepStrictEqual(Object.keys(calls[0].update.$set).sort(), ['library', 'syncToken'], 'only the library and its token are written');

    // Another save landed first: nothing is written over it.
    account.syncToken = 4;
    matched = 0;
    result = await save();
    assert.strictEqual(result.status, 400, 'a lost race is refused as out of date');

    console.log('unit-save-library-race: ok');
    process.exit(0);
})().catch((err) => { console.error(err); process.exit(1); });
