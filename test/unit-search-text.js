/**
 * Unit test: Discover search helpers (server/search-text.js).
 * Words are lowercased and stripped of accents, a query word matches the start of a word, and
 * a list scores higher when the word is in its name than only in one of its items.
 * Run with: node test/unit-search-text.js
 */

'use strict';

const assert = require('assert');
const {
    normalizeWord,
    tokenize,
    buildSearchTokens,
    parseQuery,
    prefixPatterns,
    scoreProjection,
} = require('../server/search-text.js');

// Normalisation: case and accents do not matter.
assert.strictEqual(normalizeWord('Étanche'), 'etanche');
assert.deepStrictEqual(tokenize('Sac étanche (Sea-to-Summit) 3L'), ['sac', 'etanche', 'sea', 'to', 'summit', '3l']);
assert.deepStrictEqual(tokenize(''), []);
assert.deepStrictEqual(tokenize(null), []);
assert.deepStrictEqual(tokenize('a b'), [], 'one-letter words are noise');

// Index tokens: unique, from every searchable source, capped.
const tokens = buildSearchTokens({
    name: 'PCT 2026',
    description: 'Thru hike',
    ownerDisplayName: 'Fx',
    ownerUsername: 'fxb',
    itemNames: ['Tarp', 'Sac de couchage', 'Tarp'],
    itemBrands: ['Black Diamond'],
});
assert.ok(tokens.includes('pct') && tokens.includes('couchage') && tokens.includes('diamond') && tokens.includes('fxb'));
assert.strictEqual(tokens.filter((t) => t === 'tarp').length, 1, 'tokens are unique');
const withDescriptions = buildSearchTokens({ itemNames: ['Lunar Solo'], itemDescriptions: ['Tente, sans piquets'] });
assert.ok(withDescriptions.includes('tente') && withDescriptions.includes('lunar'), 'item descriptions are indexed');
const crowded = buildSearchTokens({
    itemNames: ['Lunar Solo'],
    itemDescriptions: Array.from({ length: 2000 }, (_, i) => `desc${i}x`),
});
assert.ok(crowded.includes('lunar') && crowded.length <= 400, 'descriptions never crowd out item names');
const many = buildSearchTokens({ itemNames: Array.from({ length: 2000 }, (_, i) => `word${i}x`) });
assert.ok(many.length <= 400, 'token list is capped');

// Query parsing: normalised words, bounded.
assert.deepStrictEqual(parseQuery('  Sac   Étanche '), ['sac', 'etanche']);
assert.deepStrictEqual(parseQuery(''), []);
assert.strictEqual(parseQuery('a b c d e f g h i j k l').length <= 6, true);

// Prefix patterns are anchored and escaped, so they can use the index and cannot inject regex.
const [pattern] = prefixPatterns(['sa.c']);
assert.ok(pattern.test('sa.cs') && !pattern.test('saxc') && !pattern.test('xsa.c'));

// Scoring: name > owner > description > items only. Every query word must match.
const base = {
    name: 'Randonnée légère',
    ownerDisplayName: 'Alice',
    ownerUsername: 'alice',
    description: 'Un weekend avec tente',
    searchTokens: ['randonnee', 'legere', 'alice', 'un', 'weekend', 'avec', 'tente', 'sac', 'tarp'],
};
const inName = { ...base, name: 'Sac léger' };
const inOwner = { ...base, ownerDisplayName: 'Sacha' };
const inDescription = { ...base, description: 'Mon sac préféré' };
const inItemOnly = base;
const score = (list, q) => scoreProjection(list, parseQuery(q));
assert.ok(score(inName, 'sac') > score(inOwner, 'sac'));
assert.ok(score(inOwner, 'sac') > score(inDescription, 'sac'));
assert.ok(score(inDescription, 'sac') > score(inItemOnly, 'sac'));
assert.ok(score(inItemOnly, 'sac') > 0);
assert.strictEqual(score(base, 'sac zzz'), 0, 'a list must contain every query word');
assert.ok(score({ ...base, name: 'Sacs' }, 'sac') > 0, 'prefix: sac matches sacs');
assert.ok(score({ ...base, name: 'Étanche' }, 'etan') > 0, 'accents ignored');

console.log('ok');
