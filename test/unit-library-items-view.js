'use strict';

const {
    filterLibraryItems,
    calculateVirtualWindow,
} = require('../client/services/library-items-view.js');

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

console.log('\n--- Library items view ---');

const items = Array.from({ length: 100 }, (_, index) => ({
    id: index + 1,
    name: `Item ${index + 1}`,
    description: index === 49 ? 'needle' : '',
    category: index % 2 ? 'Sleep' : 'Shelter',
    tags: index === 49 ? ['winter'] : [],
}));

const filtered = filterLibraryItems(items, {
    searchText: 'needle',
    category: 'Sleep',
    tags: ['winter'],
}, [50]);
assert('filters the complete collection', filtered.length === 1 && filtered[0].id === 50);
assert('marks active-list membership', filtered[0].inCurrentList === true);
assert('does not mutate source items', typeof items[49].inCurrentList === 'undefined');

const windowed = calculateVirtualWindow({
    items,
    scrollTop: 1000,
    viewportHeight: 300,
    rowHeight: 50,
    overscan: 2,
});
assert('starts before visible rows for overscan', windowed.start === 18);
assert('ends after visible rows for overscan', windowed.end === 28);
assert('returns only the virtual slice', windowed.items.length === 10);
assert('preserves total scroll height', windowed.top + windowed.bottom + windowed.items.length * 50 === 5000);

const emptyWindow = calculateVirtualWindow({ items: [], scrollTop: 100, viewportHeight: 300, rowHeight: 50, overscan: 2 });
assert('handles empty items', emptyWindow.start === 0 && emptyWindow.end === 0 && emptyWindow.items.length === 0);

const negativeScrollWindow = calculateVirtualWindow({ items, scrollTop: -100, viewportHeight: 100, rowHeight: 50, overscan: 1 });
assert('clamps negative scroll', negativeScrollWindow.start === 0 && negativeScrollWindow.end === 3);

const endWindow = calculateVirtualWindow({ items, scrollTop: 4900, viewportHeight: 300, rowHeight: 50, overscan: 2 });
assert('clamps the end of the list', endWindow.start === 96 && endWindow.end === 100 && endWindow.items.length === 4);

const beyondEndWindow = calculateVirtualWindow({ items, scrollTop: 10000, viewportHeight: 300, rowHeight: 50, overscan: 2 });
assert('clamps start when scrolling beyond the final row', beyondEndWindow.start === 100 && beyondEndWindow.start <= beyondEndWindow.end);
assert('preserves height when scrolling beyond the final row', beyondEndWindow.top + beyondEndWindow.bottom + beyondEndWindow.items.length * 50 === 5000);

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
