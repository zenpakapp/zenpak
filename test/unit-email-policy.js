const assert = require('assert');

const { canonicalEmail, emailLookup } = require('../server/email-policy.js');

assert.strictEqual(canonicalEmail('  User@Example.COM  '), 'user@example.com');
assert.strictEqual(canonicalEmail(null), '');
assert.deepStrictEqual(emailLookup('User+Test@Example.COM'), {
    email: { $regex: '^user\\+test@example\\.com$', $options: 'i' },
});

console.log('email policy ok');
