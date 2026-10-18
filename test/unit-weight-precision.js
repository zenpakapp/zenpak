/**
 * Unit test: item weights keep enough precision to survive unit switches and re-saves.
 * Item weights are stored in mg and shown through MgToItemWeight: a small item must never
 * display as 0 and the shown value must be within 2% of the stored one.
 * Run with: node test/unit-weight-precision.js
 */

'use strict';

const assert = require('assert');
const weightUtils = require('../client/utils/weight.js');

const UNITS = ['g', 'kg', 'oz', 'lb'];
const SAMPLES_MG = [500, 1000, 1500, 4000, 28349, 100000, 690000, 1234567, 5000000];

// Exact values keep the display they had before.
assert.strictEqual(weightUtils.MgToItemWeight(690000, 'g'), 690);
assert.strictEqual(weightUtils.MgToItemWeight(1500000, 'kg'), 1.5);
assert.strictEqual(weightUtils.MgToItemWeight(100000, 'oz'), 3.53);
assert.strictEqual(weightUtils.MgToItemWeight(0, 'g'), 0);
assert.strictEqual(weightUtils.MgToItemWeight(undefined, 'g'), 0);

// A light item never shows 0 and stays close to its real weight.
assert.strictEqual(weightUtils.MgToItemWeight(4000, 'kg'), 0.004);
assert.strictEqual(weightUtils.MgToItemWeight(1500, 'g'), 1.5);
assert.strictEqual(weightUtils.MgToItemWeight(1000, 'lb'), 0.0022);

for (const mg of SAMPLES_MG) {
    for (const unit of UNITS) {
        const shown = weightUtils.MgToItemWeight(mg, unit);
        assert.ok(shown > 0, `${mg} mg shows 0 in ${unit}`);
        const resaved = weightUtils.WeightToMg(shown, unit);
        const error = Math.abs(resaved - mg) / mg;
        assert.ok(error <= 0.02, `${mg} mg in ${unit}: shown ${shown}, re-saved ${Math.round(resaved)} mg (${(error * 100).toFixed(1)}% off)`);
    }
}

// Retyping the shown value across unit switches does not drift away.
for (const startMg of [1000, 4000, 28349, 690000]) {
    let mg = startMg;
    for (let cycle = 0; cycle < 10; cycle += 1) {
        for (const unit of ['oz', 'g', 'lb', 'kg', 'g']) {
            mg = weightUtils.WeightToMg(weightUtils.MgToItemWeight(mg, unit), unit);
        }
    }
    const drift = Math.abs(mg - startMg) / startMg;
    assert.ok(drift <= 0.05, `${startMg} mg drifted ${(drift * 100).toFixed(1)}% after 50 retypes`);
}

// Unknown units behave like MgToWeight.
assert.strictEqual(weightUtils.MgToItemWeight(1000, 'stone'), weightUtils.MgToWeight(1000, 'stone'));

console.log('ok');
