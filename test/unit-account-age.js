'use strict';

// A brand-new account cannot yet list a list for search engines; the age comes from the _id.

const { ObjectId } = require('mongodb');
const { canListForSearch, indexingDelayDays, DEFAULT_INDEXING_DELAY_DAYS } = require('../server/account-age.js');

let passed = 0;
let failed = 0;
function assert(description, condition) {
    if (condition) { console.log(`  PASS  ${description}`); passed++; } else { console.error(`  FAIL  ${description}`); failed++; }
}

const now = new Date('2026-11-22T12:00:00.000Z');
const userCreated = (daysAgo) => ({ _id: new ObjectId(Math.floor((now.getTime() - daysAgo * 86400000) / 1000)) });

assert('the delay is 7 days by default', DEFAULT_INDEXING_DELAY_DAYS === 7 && indexingDelayDays(undefined) === 7);
assert('a number or a numeric string sets the delay', indexingDelayDays(3) === 3 && indexingDelayDays('14') === 14);
assert('0 turns the wait off', indexingDelayDays('0') === 0);
assert('a wrong value falls back to the default', indexingDelayDays('soon') === 7 && indexingDelayDays(-2) === 7);

assert('an account made an hour ago cannot list for search', canListForSearch(userCreated(1 / 24), { now }) === false);
assert('an account made 6 days ago cannot', canListForSearch(userCreated(6), { now }) === false);
assert('an account made 7 days ago can', canListForSearch(userCreated(7), { now }) === true);
assert('an old account can', canListForSearch(userCreated(400), { now }) === true);
assert('with the delay at 0 a new account can', canListForSearch(userCreated(0), { now, delayDays: 0 }) === true);
assert('an account whose age is unknown is not blocked', canListForSearch({ _id: 'x' }, { now }) === true && canListForSearch(null, { now }) === true);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
