// Text search for Discover. Each public list is projected with a `searchTokens` array (the
// normalised words of its name, author, description, item names, brands and item
// descriptions). A query word matches the start of a token, so "sac" finds "sacs" and typing a
// word still works, and the lookup is an anchored regex on that array, which a MongoDB index
// can serve.

const MAX_TOKENS = 400;
const MAX_QUERY_WORDS = 6;

// Weight of the best field a query word is found in.
const WEIGHT_NAME = 8;
const WEIGHT_OWNER = 4;
const WEIGHT_DESCRIPTION = 2;
const WEIGHT_ITEMS = 1;

function normalizeWord(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase();
}

function tokenize(text) {
    return normalizeWord(text)
        .split(/[^a-z0-9]+/)
        .filter((word) => word.length >= 2);
}

// Version of what `searchTokens` is built from; a projection with an older one is rebuilt at
// startup (item descriptions joined the index in version 2).
const SEARCH_TOKENS_VERSION = 2;

// Item descriptions come last, so the cap drops them before names and brands.
function buildSearchTokens({
    name, description, ownerDisplayName, ownerUsername, itemNames = [], itemBrands = [], itemDescriptions = [],
}) {
    const sources = [
        name, ownerDisplayName, ownerUsername, description, ...itemNames, ...itemBrands, ...itemDescriptions,
    ];
    return [...new Set(sources.flatMap(tokenize))].slice(0, MAX_TOKENS);
}

function parseQuery(text) {
    return [...new Set(tokenize(text))].slice(0, MAX_QUERY_WORDS);
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function prefixPatterns(words) {
    return words.map((word) => new RegExp(`^${escapeRegExp(word)}`));
}

function fieldMatches(fieldTokens, word) {
    return fieldTokens.some((token) => token.startsWith(word));
}

// 0 when a query word is nowhere in the list; otherwise the sum, per word, of the weight of
// the best field it appears in.
function scoreProjection(list, words) {
    if (!words.length) return 0;
    const name = tokenize(list.name);
    const owner = tokenize(`${list.ownerDisplayName || ''} ${list.ownerUsername || ''}`);
    const description = tokenize(list.description);
    const all = Array.isArray(list.searchTokens) ? list.searchTokens : [];

    const weights = words.map((word) => {
        if (fieldMatches(name, word)) return WEIGHT_NAME;
        if (fieldMatches(owner, word)) return WEIGHT_OWNER;
        if (fieldMatches(description, word)) return WEIGHT_DESCRIPTION;
        if (fieldMatches(all, word)) return WEIGHT_ITEMS;
        return 0;
    });
    return weights.includes(0) ? 0 : weights.reduce((sum, weight) => sum + weight, 0);
}

module.exports = {
    SEARCH_TOKENS_VERSION,
    normalizeWord,
    tokenize,
    buildSearchTokens,
    parseQuery,
    prefixPatterns,
    scoreProjection,
};
