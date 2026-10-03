'use strict';

/**
 * Unit test: List.prototype.renderChart must reuse calculated subtotals.
 * Run with: node test/unit-list-chart-performance.js
 */

const { Library } = require('../client/dataTypes.js');

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

console.log('\n--- List chart performance ---');

const library = new Library();
const list = library.getListById(library.defaultListId);
const category = library.getCategoryById(list.categoryIds[0]);
category.name = 'Shelter';

const item = library.newItem({ category });
library.updateItem({ ...item, name: 'Tent', weight: 1000 });
list.calculateTotals();

const originalCalculateSubtotal = category.calculateSubtotal.bind(category);
let subtotalCount = 0;
category.calculateSubtotal = () => {
    subtotalCount++;
    return originalCalculateSubtotal();
};

const chart = list.renderChart();

assert('chart renders from existing subtotals', chart && chart.total === 1000);
assert('chart does not recalculate category subtotals', subtotalCount === 0);
assert('chart preserves category name', chart.points[0].name === 'Shelter');

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
