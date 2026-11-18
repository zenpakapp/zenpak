'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const renderers = ['client/services/list-chart.js', 'client/views/public-list.vue'];
const localSettings = /^\s*(borderColor|borderWidth|hoverBorderColor|hoverBorderWidth|hoverOffset|cutout|animation)\s*:/m;

for (const file of renderers) {
    const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    const script = file.endsWith('.vue') ? source.split('<script>')[1].split('</script>')[0] : source;

    assert.doesNotMatch(script, localSettings, `${file}: use shared donut settings`);
    assert.match(script, /require\(['"]\.\.\/services\/donut-settings['"]\)|require\(['"]\.\/donut-settings['"]\)/);
    assert.match(script, /\.\.\.donutDatasetStyle\(\)/, `${file}: apply the shared dataset style`);
    assert.match(script, /\.\.\.donutOptions\(\)/, `${file}: apply the shared chart options`);
}

console.log('unit-donut-settings: ok (editor and public list)');
