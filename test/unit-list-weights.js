/**
 * Unit test: the weights of a List (Total, Worn, Consumable, Base, Pack) and of the chart built from
 * them. The expected numbers are worked out by hand below, not by the formulas under test.
 * Run with: node test/unit-list-weights.js
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
const near = (a, b) => Math.abs(a - b) < 1e-9;

const { buildWeightedList } = require('./fixtures/weighted-list.js');

const build = buildWeightedList;

console.log('\n--- Category subtotals ---');
{
    const { gear, food } = build();
    assert('Gear: total 2000', gear.subtotalWeight === 2000);
    assert('Gear: worn counts one unit of the jacket (500, not 1000)', gear.subtotalWornWeight === 500);
    assert('Gear: no consumable', gear.subtotalConsumableWeight === 0);
    assert('Gear: the optional spare weighs nothing', gear.subtotalQty === 3);
    assert('Food: total 900', food.subtotalWeight === 900);
    assert('Food: consumable counts every unit (900)', food.subtotalConsumableWeight === 900);
    assert('Food: nothing worn', food.subtotalWornWeight === 0);
    assert('Gear: Base Weight 1500 (total - worn - consumable)', gear.subtotalBaseWeight === 1500);
    assert('Gear: Pack Weight 1500 (total - worn)', gear.subtotalPackWeight === 1500);
    assert('Food: Base Weight 0, Pack Weight 900', food.subtotalBaseWeight === 0 && food.subtotalPackWeight === 900);
}

console.log('\n--- A Category is recalculated, not accumulated ---');
{
    const { gear } = build();
    gear.calculateSubtotal();
    gear.calculateSubtotal();
    assert('a second calculation changes nothing', gear.subtotalBaseWeight === 1500 && gear.subtotalPackWeight === 1500);
}

console.log('\n--- List totals ---');
{
    const { list } = build();
    assert('Total Weight 2900', list.totalWeight === 2900);
    assert('Worn Weight 500', list.totalWornWeight === 500);
    assert('Consumable Weight 900', list.totalConsumableWeight === 900);
    assert('Base Weight 1500 (total - worn - consumable)', list.totalBaseWeight === 1500);
    assert('Pack Weight 2400 (total - worn)', list.totalPackWeight === 2400);
}

console.log('\n--- The optional fields gate worn and consumable ---');
{
    const { library, list } = build();
    library.optionalFields.worn = false;
    library.optionalFields.consumable = false;
    list.calculateTotals();
    assert('worn off: nothing is excluded as worn', list.totalWornWeight === 0);
    assert('consumable off: nothing is excluded as consumable', list.totalConsumableWeight === 0);
    assert('so Base Weight equals Total Weight', list.totalBaseWeight === 2900 && list.totalPackWeight === 2900);
}

console.log('\n--- Chart, one type at a time ---');
{
    const { list, gear, food } = build();
    const slice = (chart, category) => Object.values(chart.points).find((p) => p.id === category.id);

    const total = list.renderChart('total', false);
    assert('total: chart total 2900', total.total === 2900);
    assert('total: Gear slice 2000 (68.97 %)', slice(total, gear).total === 2000 && near(slice(total, gear).percent, 2000 / 2900));
    assert('total: Food slice 900', slice(total, food).total === 900);

    const base = list.renderChart('base', false);
    assert('base: chart total 1500', base.total === 1500);
    assert('base: Gear slice 1500, Food slice 0', slice(base, gear).total === 1500 && slice(base, food).total === 0);

    const worn = list.renderChart('worn', false);
    assert('worn: chart total 500, all in Gear', worn.total === 500 && slice(worn, gear).total === 500 && slice(worn, food).total === 0);

    const consumable = list.renderChart('consumable', false);
    assert('consumable: chart total 900, all in Food', consumable.total === 900 && slice(consumable, food).total === 900);

    assert('basePercent: Gear carries 100 % of the base weight, Food 0 %',
        near(slice(total, gear).basePercent, 1) && near(slice(total, food).basePercent, 0));
}

console.log('\n--- Chart with nothing to show ---');
{
    const { library, list } = build();
    library.optionalFields.worn = false;
    list.calculateTotals();
    assert('a type with a zero total gives no chart', list.renderChart('worn', false) === false);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
