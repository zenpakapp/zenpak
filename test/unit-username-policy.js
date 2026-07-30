const assert = require('assert');
const { isReservedUsername, normalizeBrandConfusables, normalizeUsername } = require('../server/username-policy.js');

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

console.log('username policy ok');
