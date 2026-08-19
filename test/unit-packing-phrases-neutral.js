/**
 * Unit test: the packing-completion phrase pools (client/data/packing-phrases.*.js,
 * shown in list.vue when a List reaches 100% packed) must read as activity-neutral —
 * no hiking-specific vocabulary, since a List can now be tagged travel/business/
 * bikepacking just as easily as hiking (see #13).
 * Run with: node test/unit-packing-phrases-neutral.js
 */

'use strict';

let passed = 0;
let failed = 0;

function assert(description, condition) {
    if (condition) {
        console.log(`  PASS  ${description}`);
        passed++;
    } else {
        console.error(`  FAIL  ${description}`);
        failed++;
    }
}

const phrasesEn = require('../client/data/packing-phrases.en.js');
const phrasesFr = require('../client/data/packing-phrases.fr.js');

const BLACKLIST = /rando|hike|trail|mountain|montagne|sentier/i;

console.log('\n--- packing-phrases.en.js is a non-empty array of strings ---');
assert('is an array', Array.isArray(phrasesEn));
assert('is non-empty', phrasesEn.length > 0);
assert('every entry is a string', phrasesEn.every((p) => typeof p === 'string' && p.trim().length > 0));

console.log('\n--- packing-phrases.fr.js is a non-empty array of strings ---');
assert('is an array', Array.isArray(phrasesFr));
assert('is non-empty', phrasesFr.length > 0);
assert('every entry is a string', phrasesFr.every((p) => typeof p === 'string' && p.trim().length > 0));

console.log('\n--- no hiking-specific vocabulary in either pool ---');
for (const phrase of phrasesEn) {
    assert(`en: no blacklisted term in "${phrase}"`, !BLACKLIST.test(phrase));
}
for (const phrase of phrasesFr) {
    assert(`fr: no blacklisted term in "${phrase}"`, !BLACKLIST.test(phrase));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
