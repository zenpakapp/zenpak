/**
 * Unit test: a list description rendered on the legacy pages cannot carry a script link.
 * Run with: node test/unit-markdown-safe.js
 */

'use strict';

const assert = require('assert');
const { renderDescription, isSafeAddress } = require('../server/markdown-safe.js');

// Addresses that run code or load something else are replaced by an anchor.
[
    '[x](javascript:alert(1))',
    '[x](JaVaScRiPt:alert(1))',
    '[x](java\tscript:alert(1))',
    '[x](data:text/html;base64,AAAA)',
    '[x](vbscript:foo)',
    '[x][1]\n\n[1]: javascript:alert(1)',
    '![a](javascript:alert(1))',
].forEach((source) => {
    const html = renderDescription(source);
    assert.ok(!/javascript:|vbscript:|data:text/i.test(html.replace(/\s/g, '')), `${JSON.stringify(source)} is neutralised: ${html}`);
    assert.ok(/(href|src)="#"/.test(html), `${JSON.stringify(source)} points at an anchor`);
});

// Ordinary links stay as they were.
assert.strictEqual(renderDescription('[site](https://example.com/a?b=1&c=2)'), '<p><a href="https://example.com/a?b=1&amp;c=2">site</a></p>');
assert.strictEqual(renderDescription('[mail](mailto:me@example.com)'), '<p><a href="mailto:me@example.com">mail</a></p>');
assert.strictEqual(renderDescription('[page](/pricing)'), '<p><a href="/pricing">page</a></p>');
assert.strictEqual(renderDescription('[top](#top)'), '<p><a href="#top">top</a></p>');
assert.strictEqual(renderDescription('plain *text*'), '<p>plain <em>text</em></p>');

// Markup is still escaped by the package.
assert.strictEqual(renderDescription('<script>alert(1)</script>'), '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>');

assert.ok(isSafeAddress('http://a.example'));
assert.ok(!isSafeAddress('javascript:alert(1)'));
assert.ok(!isSafeAddress('  javascript:alert(1)'));

console.log('unit-markdown-safe OK');
