const assert = require('assert');
const {
    canonicalUsername,
    isReservedDisplayName,
    isReservedUsername,
    isValidUsername,
    normalizeBrandConfusables,
    normalizeUsername,
} = require('../server/username-policy.js');

assert.strictEqual(canonicalUsername('  FrancoisPignon  '), 'francoispignon');
assert.strictEqual(isValidUsername('francoispignon'), true);
assert.strictEqual(isValidUsername('FrancoisPignon'), true);
assert.strictEqual(isValidUsername('francois_pignon'), true);
assert.strictEqual(isValidUsername('francois pignon'), false);
assert.strictEqual(isValidUsername('francois-pignon'), false);
assert.strictEqual(normalizeUsername('ZenPak'), 'zenpak');
assert.strictEqual(normalizeUsername('zen_pak'), 'zenpak');
assert.strictEqual(normalizeUsername('zen-pak'), 'zenpak');
assert.strictEqual(normalizeBrandConfusables('z3npak'), 'zenpak');
assert.strictEqual(isReservedUsername('ZenPak'), true);
assert.strictEqual(isReservedUsername('zen_pak'), true);
assert.strictEqual(isReservedUsername('z3npak'), true);
assert.strictEqual(isReservedUsername('zenpac'), true);
assert.strictEqual(isReservedUsername('zenpaq'), true);
assert.strictEqual(isReservedUsername('ZenPakOfficial'), true);
assert.strictEqual(isReservedUsername('zenpak_app'), true);
assert.strictEqual(isReservedUsername('z3npak-support'), true);
assert.strictEqual(isReservedUsername('support'), true);
assert.strictEqual(isReservedUsername('wayfarer42'), false);
assert.strictEqual(isReservedDisplayName('ZenPak autre'), true);
assert.strictEqual(isReservedDisplayName('Z3nPak Team'), true);
assert.strictEqual(isReservedDisplayName('Support'), true);
assert.strictEqual(isReservedDisplayName('FX ZenPak fan'), false);
assert.strictEqual(isReservedDisplayName('François Pignon'), false);

console.log('username policy ok');
