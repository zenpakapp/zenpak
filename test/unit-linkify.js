/**
 * Unit test: URLs in a list description become links (client/utils/linkify.js).
 * Only http(s), at most `maxLinks`, punctuation around a URL is not part of it, and the text is
 * never interpreted as HTML: the result is plain segments for the template to render.
 * Run with: node test/unit-linkify.js
 */

'use strict';

const assert = require('assert');
const { collapseLineBreaks, splitLinks } = require('../client/utils/linkify.js');

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
    { type: 'link', value: 'https://example.com/page', href: 'https://example.com/page' },
    { type: 'text', value: ' now' },
]);
assert.strictEqual(text(one), 'see https://example.com/page now');

// http and https only; no other scheme.
assert.deepStrictEqual(links(splitLinks('http://a.example and https://b.example', 3)), ['http://a.example', 'https://b.example']);
assert.deepStrictEqual(links(splitLinks('javascript:alert(1) data:text/html,x ftp://f.example mailto:a@b.c', 3)), []);

// An address typed without the scheme is a link to https. The text keeps what was typed.
const hrefs = (segments) => segments.filter((s) => s.type === 'link').map((s) => s.href);
const bare = splitLinks('Follow @instagram.com/kinredgta) and www.example.com/page.', 3);
assert.deepStrictEqual(links(bare), ['instagram.com/kinredgta', 'www.example.com/page']);
assert.deepStrictEqual(hrefs(bare), ['https://instagram.com/kinredgta', 'https://www.example.com/page']);
assert.strictEqual(text(bare), 'Follow @instagram.com/kinredgta) and www.example.com/page.', 'the text is rebuilt as typed');
assert.deepStrictEqual(hrefs(splitLinks('see www.example.com now', 3)), ['https://www.example.com'], 'www. alone is enough');
assert.deepStrictEqual(hrefs(splitLinks('youtube.com/@kinred', 3)), ['https://youtube.com/@kinred']);
assert.deepStrictEqual(hrefs(splitLinks('a.b.example.org/x/y?z=1', 3)), ['https://a.b.example.org/x/y?z=1'], 'subdomains');
// A full URL keeps its own scheme, and is not matched twice for the "www." inside it.
assert.deepStrictEqual(hrefs(splitLinks('http://www.example.com/a', 3)), ['http://www.example.com/a']);
assert.strictEqual(links(splitLinks('https://www.youtube.com/@kinred', 3)).length, 1);

// What looks like an address but is not one stays text: no path, unknown ending, e-mail, number.
assert.deepStrictEqual(links(splitLinks('example.com and tent.png and e.g. v1.2/3 and 3.5.com', 3)), []);
assert.deepStrictEqual(links(splitLinks('write to name@example.com/x or a@b.com', 3)), []);
assert.deepStrictEqual(links(splitLinks('see file.txt/backup and notes.docx/x', 3)), []);
// Glued to something on its left, it is not the start of an address.
assert.deepStrictEqual(links(splitLinks('name@example.com/x', 3)), []);
assert.deepStrictEqual(links(splitLinks('path/www.example.com/x', 3)), []);

// Scheme-less addresses count toward the limit too.
const mixed = splitLinks('https://1.example www.2.example/a instagram.com/3 youtube.com/4', 3);
assert.deepStrictEqual(links(mixed), ['https://1.example', 'www.2.example/a', 'instagram.com/3']);

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

// Line breaks: never more than one in a row, so a description cannot push the page down.
assert.strictEqual(collapseLineBreaks('a\nb'), 'a\nb');
assert.strictEqual(collapseLineBreaks('a\n\nb'), 'a\nb', 'a blank line becomes a single break');
assert.strictEqual(collapseLineBreaks(`a${'\n'.repeat(50)}b`), 'a\nb');
assert.strictEqual(collapseLineBreaks('a \n  \n \t\n b'), 'a\nb', 'lines holding only spaces count as empty');
assert.strictEqual(collapseLineBreaks('a\r\n\r\n\r\nb'), 'a\nb', 'Windows line ends too');
assert.strictEqual(collapseLineBreaks('\n\n\na\n\n\n'), 'a', 'none at the start or the end');
assert.strictEqual(collapseLineBreaks('one line'), 'one line');
assert.strictEqual(collapseLineBreaks(''), '');
assert.strictEqual(collapseLineBreaks(null), '');
assert.strictEqual(collapseLineBreaks(undefined), '');

console.log('ok');
