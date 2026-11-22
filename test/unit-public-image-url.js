'use strict';

// A public page shows only pictures stored in ZenPak's own Cloudinary account.

const { publicImageUrl } = require('../server/public-image-url.js');

let passed = 0;
let failed = 0;
function assert(description, condition) {
    if (condition) { console.log(`  PASS  ${description}`); passed++; } else { console.error(`  FAIL  ${description}`); failed++; }
}

const cloud = 'mycloud';
const own = 'https://res.cloudinary.com/mycloud/image/upload/v1/items/tent.jpg';

assert('a picture of the own account is kept', publicImageUrl(own, cloud) === own);
assert('a tracker on another host is dropped', publicImageUrl('https://evil.example/pixel.gif?v=1', cloud) === '');
assert('another Cloudinary account is dropped', publicImageUrl('https://res.cloudinary.com/other/image/upload/x.jpg', cloud) === '');
assert('a lookalike host is dropped', publicImageUrl('https://res.cloudinary.com.evil.example/mycloud/x.jpg', cloud) === '');
assert('a host that only starts with the account name is dropped', publicImageUrl('https://res.cloudinary.com/mycloud-evil/x.jpg', cloud) === '');
assert('plain http is dropped', publicImageUrl('http://res.cloudinary.com/mycloud/x.jpg', cloud) === '');
assert('credentials in the address are dropped', publicImageUrl('https://user:pw@res.cloudinary.com/mycloud/x.jpg', cloud) === '');
assert('a data address is dropped', publicImageUrl('data:image/gif;base64,R0lGOD', cloud) === '');
assert('empty, missing and non-text values give an empty string', publicImageUrl('', cloud) === '' && publicImageUrl(undefined, cloud) === '' && publicImageUrl(42, cloud) === '');
assert('with no account set up, nothing is shown', publicImageUrl(own, '') === '');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
