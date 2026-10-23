/**
 * Unit test: wrong passwords sent in the body of any authenticated route are counted, and past
 * the limit the route answers 429 even for the right password.
 * Run with: node test/unit-password-attempts.js
 */

'use strict';

process.env.NODE_CONFIG = JSON.stringify({
    environment: 'test',
    databaseUrl: 'localhost/test',
    deployUrl: 'http://localhost:3000',
});
delete process.env.AUTH_RATE_LIMIT_MAX;

const assert = require('assert');
const bcrypt = require('bcryptjs');
const db = require('../server/db.js');

const hash = bcrypt.hashSync('right-password', 4);
const dana = { _id: 'u1', username: 'dana', password: hash };
db.users.findOne = (query, cb) => {
    const user = query.username === 'dana' ? dana : null;
    if (cb) return cb(null, user);
    return Promise.resolve(user);
};
db.users.updateOne = () => Promise.resolve();

const { authenticateUser } = require('../server/auth.js');
const attempts = require('../server/password-attempts.js');

function attempt(password, ip = '1.1.1.1') {
    return new Promise((resolve) => {
        const res = {
            statusCode: 200,
            status(code) { this.statusCode = code; return this; },
            json() { resolve({ status: this.statusCode }); },
            cookie() {},
        };
        authenticateUser({ body: { username: 'dana', password }, cookies: {}, ip }, res, () => resolve({ status: 200, reached: true }));
    });
}

(async () => {
    for (let i = 0; i < 10; i += 1) {
        const r = await attempt('wrong');
        assert.strictEqual(r.status, 404, `attempt ${i + 1} is answered as wrong`);
    }
    let r = await attempt('right-password');
    assert.strictEqual(r.status, 429, 'past the limit even the right password waits');
    assert.ok(!r.reached, 'the route is not reached');

    // Another client is not blocked by the first one's failures on its own budget.
    r = await attempt('right-password', '2.2.2.2');
    assert.ok(r.reached, 'another address still gets in');

    // The window ends.
    const req = { ip: '3.3.3.3' };
    for (let i = 0; i < 10; i += 1) attempts.recordFailure(req, 'erin', 1000);
    assert.ok(attempts.isLimited(req, 'erin', 1000 + 1000));
    assert.ok(!attempts.isLimited(req, 'erin', 1000 + attempts.WINDOW_MS + 1), 'the limit is lifted after 15 minutes');

    console.log('unit-password-attempts: ok');
    process.exit(0);
})().catch((err) => { console.error(err); process.exit(1); });
