/**
 * Unit test: the contact address shown to users is one that receives mail. `info@zenpak.app` does
 * not exist, so a message sent to it was lost; the address is `support@zenpak.app`, the one the
 * e-mails already use as Reply-To.
 * Run with: node test/unit-contact-address.js
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const DIRECTORIES = ['templates', 'client', 'server'];
const EXTENSIONS = ['.mustache', '.vue', '.js', '.json'];

function filesIn(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(directory, entry.name);
        if (entry.isDirectory()) return filesIn(full);
        return EXTENSIONS.includes(path.extname(entry.name)) ? [full] : [];
    });
}

const files = DIRECTORIES.flatMap((directory) => filesIn(path.join(root, directory)));
assert.ok(files.length > 50, 'the scan found the source files');

const withOldAddress = files.filter((file) => fs.readFileSync(file, 'utf8').includes('info@zenpak.app'));
assert.deepStrictEqual(withOldAddress.map((file) => path.relative(root, file)), [], 'no page points to info@zenpak.app');

// The legal pages give the real address.
['legal', 'privacy', 'terms'].forEach((page) => {
    const text = fs.readFileSync(path.join(root, 'templates', `${page}.mustache`), 'utf8');
    assert.ok(text.includes('mailto:support@zenpak.app'), `${page} links to support@zenpak.app`);
});

console.log('ok');
