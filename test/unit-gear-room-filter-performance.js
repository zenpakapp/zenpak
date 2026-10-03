'use strict';

/**
 * Unit/perf test: Gear Room search and sort should avoid per-keystroke
 * lower-case scans and repeated sort-key calculation.
 * Run with: node test/unit-gear-room-filter-performance.js
 */

const { performance } = require('perf_hooks');
const {
    buildSearchableItems,
    filterSearchableItems,
    sortItems,
} = require('../client/services/gear-room-filters.js');

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

function itemDisplayName(item) {
    return [item.brand, item.name].filter(Boolean).join(' ');
}

function naiveSortValue(item, key) {
    if (key === 'weight') return item.weight || 0;
    if (key === 'price') return item.price || 0;
    if (key === 'starred') return item.starred ? 1 : 0;
    if (key === 'category') return (item.category || '').toLowerCase();
    return itemDisplayName(item).toLowerCase();
}

function naiveFilterAndSort(items, query, key, asc) {
    const q = query.toLowerCase();
    const filtered = items.filter((item) => (item.name || '').toLowerCase().includes(q)
        || (item.description || '').toLowerCase().includes(q)
        || (item.brand || '').toLowerCase().includes(q));
    filtered.sort((a, b) => {
        const va = naiveSortValue(a, key);
        const vb = naiveSortValue(b, key);
        if (va < vb) return asc ? -1 : 1;
        if (va > vb) return asc ? 1 : -1;
        return 0;
    });
    return filtered;
}

function optimizedFilterAndSort(searchableItems, query, key, asc) {
    return sortItems(filterSearchableItems(searchableItems, query), key, asc);
}

function buildItems(count) {
    const brands = ['Zpacks', 'Montbell', 'Decathlon', 'Anker', 'Senchi', 'Katadyn', 'Sea to Summit'];
    const names = ['Tent', 'Quilt', 'Fleece', 'Power Bank', 'Filter', 'Bottle', 'Stove', 'Rain Jacket'];
    const descriptions = ['ultralight shelter', 'warm synthetic layer', 'hydration water carry', 'electronics charging kit'];
    return Array.from({ length: count }, (_, index) => ({
        id: index + 1,
        brand: brands[index % brands.length],
        name: `${names[index % names.length]} ${index}`,
        description: descriptions[index % descriptions.length],
        category: index % 2 === 0 ? 'Shelter' : 'Electronics',
        weight: (index % 500) * 1000,
        price: index % 13 === 0 ? 49 : 0,
        starred: index % 17 === 0,
    }));
}

function runTimed(label, iterations, callback) {
    const start = performance.now();
    let result = null;
    for (let i = 0; i < iterations; i++) {
        result = callback(i);
    }
    const duration = performance.now() - start;
    console.log(`  ${label}: ${duration.toFixed(2)} ms`);
    return { duration, result };
}

console.log('\n--- Gear Room filter performance ---');

const items = buildItems(1000);
const queries = ['tent', 'water', 'zpacks', 'charging', 'filter', 'synthetic'];
const searchableItems = buildSearchableItems(items);
const iterations = 300;

const naive = runTimed('naive search+sort', iterations, (i) => (
    naiveFilterAndSort([...items], queries[i % queries.length], 'name', true)
));
const optimized = runTimed('indexed search+sort', iterations, (i) => (
    optimizedFilterAndSort(searchableItems, queries[i % queries.length], 'name', true)
));

const naiveIds = naive.result.map((item) => item.id).join(',');
const optimizedIds = optimized.result.map((item) => item.id).join(',');
const ratio = optimized.duration / naive.duration;

assert('optimized results match naive results', optimizedIds === naiveIds);
assert('indexed path is not slower than naive path', ratio < 1.1);
console.log(`  ratio indexed/naive: ${ratio.toFixed(2)}x`);

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
