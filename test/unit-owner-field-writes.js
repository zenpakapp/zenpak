/**
 * Unit test: account changes are written field by field, with no whole-document save, and a field
 * left undefined is removed.
 * Run with: node test/unit-owner-field-writes.js
 */

'use strict';

const assert = require('assert');
const { stubServerModule } = require('./fixtures/list-versions-fixtures.js');

const updates = [];
let failNext = false;
stubServerModule('db.js', {
    users: {
        save() { throw new Error('a whole-document save must not be used'); },
        updateOne(filter, update) {
            updates.push([filter, update]);
            if (failNext) { failNext = false; return Promise.reject(new Error('db down')); }
            return Promise.resolve({ matchedCount: 1 });
        },
    },
});

const { writeFields } = require('../server/user-field-writes.js');

(async () => {
    const user = {
        _id: 'u1', password: 'hash', token: 'tok', library: { lists: [] }, emailVerified: true, emailVerifyToken: undefined,
    };

    // Only the named fields, and an undefined one is removed.
    await writeFields(user, ['emailVerified', 'emailVerifyToken']);
    assert.deepStrictEqual(updates[0], [{ _id: 'u1' }, { $set: { emailVerified: true }, $unset: { emailVerifyToken: '' } }]);

    // Nothing to set: no empty $set (Mongo refuses one).
    await writeFields(user, ['emailVerifyToken']);
    assert.deepStrictEqual(updates[1][1], { $unset: { emailVerifyToken: '' } });

    // The library, password and token are not in a write unless asked for.
    await writeFields(user, ['password']);
    assert.deepStrictEqual(updates[2][1], { $set: { password: 'hash' } });

    // Callback style, for the routes that still use one.
    const results = [];
    await writeFields(user, ['password'], (err) => results.push(err));
    assert.deepStrictEqual(results, [null], 'success calls back with null');
    failNext = true;
    await writeFields(user, ['password'], (err) => results.push(err && err.message));
    assert.deepStrictEqual(results, [null, 'db down'], 'a failure calls back with the error');

    console.log('unit-owner-field-writes OK');
    process.exit(0);
})().catch((error) => { console.error(error); process.exit(1); });
