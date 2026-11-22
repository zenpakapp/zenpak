'use strict';

// POST /scrapeGear fetches a page for the member who typed its address: signed in only, 30 an hour.

function stub(name, exports) {
    const resolved = require.resolve(`../server/${name}`);
    require.cache[resolved] = {
        exports, id: resolved, filename: resolved, loaded: true, children: [], paths: [],
    };
}

let signedIn = true;
let scrapes = 0;
let userId = 'u1';
stub('auth.js', {
    authenticateUser(req, res, cb) {
        if (!signedIn) return res.status(401).json({ error: 'unauthorized' });
        return cb(req, res, { _id: userId, username: 'alice' });
    },
});
stub('gear-scraper.js', {
    scrapeGear: async () => { scrapes += 1; return { title: 'Tent' }; },
});
// The sub-routers pull in the database: leave them out, only the route of this test matters.
['auth-endpoints.js', 'library-endpoints.js', 'account-endpoints.js', 'profile-endpoints.js',
    'public-endpoints.js', 'list-version-endpoints.js', 'community-endpoints.js', 'guide-endpoints.js',
    'support-endpoints.js', 'report-endpoints.js', 'moderation-endpoints.js', 'notification-endpoints.js',
    'billing-endpoints.js'].forEach((name) => {
    try {
        stub(name, require('express').Router());
    } catch (err) { /* module not present */ }
});

const router = require('../server/endpoints.js');

let passed = 0;
let failed = 0;
function assert(description, condition) {
    if (condition) { console.log(`  PASS  ${description}`); passed++; } else { console.error(`  FAIL  ${description}`); failed++; }
}

async function call(body) {
    const route = router.stack.find((l) => l.route && l.route.path === '/scrapeGear');
    return new Promise((resolve) => {
        const res = {
            code: 200,
            status(c) { this.code = c; return this; },
            set() { return this; },
            json(data) { resolve({ status: this.code, data }); },
        };
        route.route.stack[0].handle({ body, ip: '1.2.3.4' }, res);
    });
}

async function run() {
    signedIn = false;
    const anonymous = await call({ url: 'https://example.com/tent' });
    assert('a visitor who is not signed in is refused', anonymous.status === 401);
    assert('the page is not fetched for a visitor', scrapes === 0);

    signedIn = true;
    const ok = await call({ url: 'https://example.com/tent' });
    assert('a signed-in member gets the page data', ok.status === 200 && ok.data.title === 'Tent');

    let firstRefused = 0;
    for (let i = 2; i <= 40; i++) {
        const { status } = await call({ url: 'https://example.com/tent' });
        if (status === 429 && !firstRefused) firstRefused = i;
    }
    assert('the 31st request of an hour is refused with 429', firstRefused === 31);

    userId = 'u2';
    const other = await call({ url: 'https://example.com/tent' });
    assert('another member is not affected', other.status === 200);

    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}
run().catch((e) => { console.error(e); process.exit(1); });
