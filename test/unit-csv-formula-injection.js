/**
 * Unit test: the CSV export cannot carry spreadsheet formulas, and the legacy image modal builds its
 * image without writing the address into HTML.
 * Run with: node test/unit-csv-formula-injection.js
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
    escapeCsvField, escapeCsvText, escapeCsvNumber, safeCommentLine,
} = require('../server/csv.js');

// Text cells that would start a formula become plain text.
['=1+1', '+SUM(A1)', '-2+3', '@SUM(A1)', '\t=1', '\r=1'].forEach((value) => {
    const cell = escapeCsvText(value);
    assert.ok(cell.replace(/^"/, '').startsWith("'"), `${JSON.stringify(value)} starts with an apostrophe`);
});
assert.strictEqual(escapeCsvText('=HYPERLINK("http://x","y")'), '"\'=HYPERLINK(""http://x"",""y"")"', 'quoting still applies after neutralising');
assert.strictEqual(escapeCsvText('Tent'), 'Tent', 'a normal name is untouched');
assert.strictEqual(escapeCsvText('a=b'), 'a=b', 'an equals sign inside a name is untouched');
assert.strictEqual(escapeCsvText(undefined), '');
assert.strictEqual(escapeCsvText('https://example.com'), 'https://example.com');

// Numeric cells: real numbers (negative too) stay numbers, anything else is text.
['12', '-3', '1.5', '.5', '-0.25', '1e3', '+2'].forEach((value) => {
    assert.strictEqual(escapeCsvNumber(value), value, `${value} stays a number`);
});
assert.strictEqual(escapeCsvNumber('=1+1'), "'=1+1");
assert.strictEqual(escapeCsvNumber('-1+2'), "'-1+2");
assert.strictEqual(escapeCsvNumber('@SUM(A1)'), "'@SUM(A1)");

// The description line is read back raw, so it is not quoted: a cell after a comma must not start a formula.
assert.strictEqual(safeCommentLine('x,=1+1'), 'x, =1+1');
assert.strictEqual(safeCommentLine('x,\t@SUM(A1)'), 'x, @SUM(A1)');
assert.strictEqual(safeCommentLine('x, -2'), 'x, -2'.replace(', -2', ', -2'), 'a cell already led by a space is fine');
assert.strictEqual(safeCommentLine('Light, fast and cheap'), 'Light, fast and cheap', 'ordinary text is untouched');
assert.strictEqual(safeCommentLine('a=b,c'), 'a=b,c');

// escapeCsvField itself keeps its plain quoting behaviour.
assert.strictEqual(escapeCsvField('a,b'), '"a,b"');

// The image modal never writes the decoded address into an HTML string.
const root = path.join(__dirname, '..');
['public/js/share.js', 'templates/embed.jmustache'].forEach((file) => {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    assert.ok(!/<img src=['"]\s*['"+$`{]/.test(source), `${file} does not build an img tag around the address`);
    assert.ok(/\.attr\((['"])src\1,/.test(source), `${file} sets the image address as a property`);
});

console.log('unit-csv-formula-injection OK');
