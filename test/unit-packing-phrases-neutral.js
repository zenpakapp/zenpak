/**
 * Unit test: the packing-completion phrase pools (client/data/packing-phrases.*.js,
 * shown in list.vue when a List reaches 100% packed) must read as activity-neutral —
 * no hiking-specific vocabulary, since a List can now be tagged travel/business/
 * bikepacking just as easily as hiking (see #13) — and must follow each language's
 * register: French formal "vous", German "du", Spanish "tú".
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

const pools = {
    en: require('../client/data/packing-phrases.en.js'),
    fr: require('../client/data/packing-phrases.fr.js'),
    de: require('../client/data/packing-phrases.de.js'),
    es: require('../client/data/packing-phrases.es.js'),
};

const BLACKLIST = /rando|hike|trail|mountain|montagne|sentier|wander|berg|senderismo|montaña/i;
// French informal address: tu, toi, ton, ta, tes, te, t'.
const FR_TUTOIEMENT = /(^|[^\p{L}])(tu|toi|ton|ta|tes|te|t')([^\p{L}]|$)/iu;

for (const [lang, phrases] of Object.entries(pools)) {
    console.log(`\n--- packing-phrases.${lang}.js is a non-empty array of strings ---`);
    assert('is an array', Array.isArray(phrases));
    assert('has as many phrases as the English pool', phrases.length === pools.en.length);
    assert('every entry is a string', phrases.every((p) => typeof p === 'string' && p.trim().length > 0));
    assert('no duplicate phrase', new Set(phrases).size === phrases.length);

    console.log(`\n--- ${lang}: no hiking-specific vocabulary ---`);
    for (const phrase of phrases) {
        assert(`${lang}: no blacklisted term in "${phrase}"`, !BLACKLIST.test(phrase));
    }
}

console.log('\n--- fr: formal "vous", never "tu" ---');
for (const phrase of pools.fr) {
    assert(`fr: no tutoiement in "${phrase}"`, !FR_TUTOIEMENT.test(phrase));
}

console.log('\n--- list.vue has a pool for every interface language ---');
const fs = require('fs');
const path = require('path');

const listVue = fs.readFileSync(path.join(__dirname, '../client/components/list.vue'), 'utf8');
for (const lang of Object.keys(pools)) {
    assert(`list.vue imports packing-phrases.${lang}`, listVue.includes(`../data/packing-phrases.${lang}`));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
