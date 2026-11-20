/**
 * Unit test: the sliding-window limiter shared by the copy and publish routes.
 * Run with: node test/unit-rate-limiter.js
 */

'use strict';

const assert = require('assert');
const { createRateLimiter } = require('../server/rate-limiter.js');

const HOUR = 60 * 60 * 1000;
const t0 = 1_000_000_000_000;

const limiter = createRateLimiter({ limit: 3, windowMs: HOUR });

assert.deepStrictEqual(limiter.check('a', t0), { limited: false, remaining: 2 }, 'first hit counts');
assert.deepStrictEqual(limiter.check('a', t0 + 1000), { limited: false, remaining: 1 });
assert.deepStrictEqual(limiter.check('a', t0 + 2000), { limited: false, remaining: 0 });

const blocked = limiter.check('a', t0 + 10 * 60 * 1000);
assert.strictEqual(blocked.limited, true, 'the 4th hit in the window is refused');
assert.strictEqual(blocked.retryAfterMinutes, 50, 'retry when the oldest hit leaves the window');

assert.strictEqual(limiter.check('b', t0 + 3000).limited, false, 'keys are independent');

// A refused hit is not counted: once the oldest hit expires, its slot opens even though a hit was refused after it.
const two = createRateLimiter({ limit: 2, windowMs: HOUR });
two.check('k', t0);
two.check('k', t0 + 1000);
assert.strictEqual(two.check('k', t0 + 2000).limited, true, 'refused while full');
assert.strictEqual(two.check('k', t0 + HOUR + 500).limited, false, 'a slot opens when the oldest hit leaves the window');
assert.strictEqual(two.check('k', t0 + HOUR + 600).limited, true, 'and only one');
const afterRefused = createRateLimiter({ limit: 1, windowMs: HOUR });
afterRefused.check('z', t0);
afterRefused.check('z', t0 + HOUR - 1000);
assert.strictEqual(afterRefused.check('z', t0 + HOUR + 1).limited, false, 'a refused hit did not push the window forward');

assert.strictEqual(
    createRateLimiter({ limit: 1, windowMs: HOUR }).check('x', t0).limited === false
    && createRateLimiter({ limit: 1, windowMs: HOUR }).limit === 1,
    true,
    'exposes its limit',
);

// Always at least one minute to wait.
const tight = createRateLimiter({ limit: 1, windowMs: 1000 });
tight.check('k', t0);
assert.strictEqual(tight.check('k', t0 + 500).retryAfterMinutes, 1, 'retry is at least 1 minute');

console.log('unit-rate-limiter: ok');
