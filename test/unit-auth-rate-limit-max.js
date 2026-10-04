'use strict';

const { authRateLimitMax } = require('../server/auth-rate-limit.js');

let passed = 0; let failed = 0;
function assert(desc, cond) {
    if (cond) { console.log(`  PASS  ${desc}`); passed++; }
    else { console.error(`  FAIL  ${desc}`); failed++; }
}

console.log('\n--- authRateLimitMax ---');
assert('unset keeps the default of 10', authRateLimitMax(undefined) === 10);
assert('empty string keeps the default', authRateLimitMax('') === 10);
assert('a positive integer raises the limit', authRateLimitMax('1000') === 1000);
assert('surrounding spaces are tolerated', authRateLimitMax(' 20 ') === 20);
assert('a non-number keeps the default', authRateLimitMax('abc') === 10);
assert('zero keeps the default, never disables the limit', authRateLimitMax('0') === 10);
assert('a negative number keeps the default', authRateLimitMax('-5') === 10);
assert('a decimal keeps the default', authRateLimitMax('5.5') === 10);
assert('Infinity keeps the default', authRateLimitMax('Infinity') === 10);
assert('a number like 1e3 keeps the default (digits only)', authRateLimitMax('1e3') === 10);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
