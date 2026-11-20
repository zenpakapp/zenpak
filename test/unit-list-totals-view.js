/**
 * Unit test: the totals the embed and print pages show are the totals of the list model. The server
 * only converts units and formats; it never has numbers of its own.
 * Run with: node test/unit-list-totals-view.js
 */

'use strict';

const { buildWeightedList } = require('./fixtures/weighted-list.js');
const { renderLibraryTotals } = require('../server/list-totals-view.js');
const weightUtils = require('../client/utils/weight.js');

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

const TOTALS = [
    '{{totalWeight}}', '{{totalWornWeight}}', '{{totalConsumableWeight}}', '{{totalBaseWeight}}', '{{totalQty}}',
    '{{totalWeightDisplay}}', '{{totalBaseWeightDisplay}}', '{{shouldDisplayBaseWeight}}',
].join('|');

function render(library) {
    return renderLibraryTotals(library, TOTALS, '{{unit}}').split('|');
}

console.log('\n--- the page shows what the list model computed ---');
{
    const { library, list } = buildWeightedList();
    const [total, worn, consumable, base, qty, totalDisplay, baseDisplay, showBase] = render(library);

    assert('Total Weight', Number(total) === list.totalWeight && list.totalWeight === 2900);
    assert('Worn Weight', Number(worn) === list.totalWornWeight && list.totalWornWeight === 500);
    assert('Consumable Weight', Number(consumable) === list.totalConsumableWeight && list.totalConsumableWeight === 900);
    assert('Base Weight', Number(base) === list.totalBaseWeight && list.totalBaseWeight === 1500);
    assert('Quantity', Number(qty) === list.totalQty && list.totalQty === 6);
    assert('the display weight is the model weight in the list unit',
        totalDisplay === String(weightUtils.MgToWeight(list.totalWeight, library.totalUnit))
        && baseDisplay === String(weightUtils.MgToWeight(list.totalBaseWeight, library.totalUnit)));
    assert('the Base Weight row shows when it differs from the Total', showBase === 'true');
}

console.log('\n--- with worn and consumable off, base equals total and the row is hidden ---');
{
    const { library, list } = buildWeightedList();
    library.optionalFields.worn = false;
    library.optionalFields.consumable = false;
    list.calculateTotals();
    const [total, worn, consumable, base, , , , showBase] = render(library);

    assert('Total Weight is unchanged', Number(total) === 2900);
    assert('nothing is excluded', Number(worn) === 0 && Number(consumable) === 0);
    assert('Base Weight equals Total Weight', Number(base) === 2900);
    assert('the Base Weight row is hidden', showBase === 'false');
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
