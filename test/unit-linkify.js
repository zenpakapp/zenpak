/**
 * Unit test: URLs in a list description become links (client/utils/linkify.js).
 * Only http(s), at most `maxLinks`, punctuation around a URL is not part of it, and the text is
 * never interpreted as HTML: the result is plain segments for the template to render.
 * Run with: node test/unit-linkify.js
 */

'use strict';

const assert = require('assert');
const { splitLinks } = require('../client/utils/linkify.js');

const links = (segments) => segments.filter((s) => s.type === 'link').map((s) => s.value);
const text = (segments) => segments.map((s) => s.value).join('');

// Plain text and empty input.
assert.deepStrictEqual(splitLinks('just words', 3), [{ type: 'text', value: 'just words' }]);
assert.deepStrictEqual(splitLinks('', 3), []);
assert.deepStrictEqual(splitLinks(null, 3), []);
assert.deepStrictEqual(splitLinks(undefined, 3), []);

// A URL splits the text around it, and the pieces rebuild the original.
const one = splitLinks('see https://example.com/page now', 3);
assert.deepStrictEqual(one, [
    { type: 'text', value: 'see ' },
    { type: 'link', value: 'https://example.com/page' },
    { type: 'text', value: ' now' },
]);
assert.strictEqual(text(one), 'see https://example.com/page now');

// http and https only; no bare "www.", no other scheme.
assert.deepStrictEqual(links(splitLinks('http://a.example and https://b.example', 3)), ['http://a.example', 'https://b.example']);
assert.deepStrictEqual(links(splitLinks('javascript:alert(1) data:text/html,x ftp://f.example www.example.com mailto:a@b.c', 3)), []);

// Trailing punctuation and closing brackets are not part of the URL.
assert.deepStrictEqual(links(splitLinks('Source: https://a.example/x, then https://b.example/y.', 3)), ['https://a.example/x', 'https://b.example/y']);
assert.deepStrictEqual(links(splitLinks('(https://a.example/x) and "https://b.example/y" or https://c.example/z!?', 3)), ['https://a.example/x', 'https://b.example/y', 'https://c.example/z']);
// ... but a bracket inside the URL stays.
assert.deepStrictEqual(links(splitLinks('https://en.wikipedia.org/wiki/Tent_(shelter)', 3)), ['https://en.wikipedia.org/wiki/Tent_(shelter)']);

// A query string is kept.
assert.deepStrictEqual(links(splitLinks('https://shop.example/tent?tag=me&x=1', 3)), ['https://shop.example/tent?tag=me&x=1']);

// At most maxLinks: the rest stays text, and nothing is lost.
const many = splitLinks('https://1.example https://2.example https://3.example https://4.example https://5.example', 3);
assert.deepStrictEqual(links(many), ['https://1.example', 'https://2.example', 'https://3.example']);
assert.strictEqual(text(many), 'https://1.example https://2.example https://3.example https://4.example https://5.example');
assert.deepStrictEqual(links(splitLinks('https://1.example https://2.example', 0)), []);

// Markup stays text: nothing here is ever rendered as HTML.
const markup = splitLinks('<a href="https://evil.example">x</a> <script>alert(1)</script>', 3);
assert.strictEqual(text(markup), '<a href="https://evil.example">x</a> <script>alert(1)</script>');
assert.ok(links(markup).every((url) => !url.includes('<') && !url.includes('"')));

// Very long URLs are still one link.
const long = `https://example.com/${'a'.repeat(500)}`;
assert.deepStrictEqual(links(splitLinks(`go ${long} now`, 3)), [long]);

console.log('ok');
