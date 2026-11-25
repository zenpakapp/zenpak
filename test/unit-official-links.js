'use strict';

// Official short links: a printed QR code leads, by date, to a list during an event and to the profile
// afterwards. The target is only ever a path of this site, written in the configuration.

const assert = require('assert');
const {
    isSitePath, resolveOfficialTarget, validOfficialLinks, registerOfficialLinks,
} = require('../server/official-links.js');

let passed = 0;
function ok(description, condition) {
    assert.ok(condition, description);
    console.log(`  PASS  ${description}`);
    passed += 1;
}

const entry = {
    phases: [{ until: '2027-03-05T00:00:00+01:00', to: '/p/abc123' }],
    fallback: '/u/zenpak',
};
const during = new Date('2027-02-28T12:00:00+01:00');
const after = new Date('2027-03-05T00:00:00+01:00');

(async () => {
    // --- phases ---
    ok('during the event it leads to the list',
        await resolveOfficialTarget(entry, { now: during }) === '/p/abc123');
    ok('at the end date it leads to the fallback (the profile)',
        await resolveOfficialTarget(entry, { now: after }) === '/u/zenpak');
    ok('long after, still the fallback',
        await resolveOfficialTarget(entry, { now: new Date('2030-01-01') }) === '/u/zenpak');
    ok('a phase with no end date never ends',
        await resolveOfficialTarget({ phases: [{ to: '/p/abc123' }], fallback: '/' }, { now: new Date('2040-01-01') }) === '/p/abc123');
    ok('the first open phase wins',
        await resolveOfficialTarget({
            phases: [{ until: '2027-01-01', to: '/community' }, { until: '2027-12-31', to: '/p/abc123' }],
        }, { now: new Date('2027-06-01') }) === '/p/abc123');

    // --- a page that is not ready never leaves a dead code ---
    ok('an empty target is skipped: the list is not ready yet',
        await resolveOfficialTarget({ phases: [{ until: '2027-03-05', to: '' }], fallback: '/u/zenpak' }, { now: during }) === '/u/zenpak');
    ok('a list that is not served falls back to the profile',
        await resolveOfficialTarget(entry, { now: during, listIsServable: async () => false }) === '/u/zenpak');
    const asked = [];
    await resolveOfficialTarget(entry, { now: during, listIsServable: async (id) => { asked.push(id); return true; } });
    ok('the list is asked by its identifier', asked.length === 1 && asked[0] === 'abc123');
    ok('with no fallback the last resort is the home page',
        await resolveOfficialTarget({ phases: [{ until: '2027-03-05', to: '' }] }, { now: during }) === '/');
    ok('an unknown entry leads to the home page', await resolveOfficialTarget(undefined, { now: during }) === '/');

    // --- never an open redirect ---
    ['//evil.example/x', 'https://evil.example', 'http://evil.example', 'javascript:alert(1)', '/\\evil.example', '/a b', '', null, 5].forEach((to) => {
        ok(`"${to}" is not a path of this site`, isSitePath(to) === false);
    });
    ok('a path of this site is accepted', isSitePath('/p/abc123') && isSitePath('/u/zenpak'));
    ok('an outside target in a phase is ignored for the fallback',
        await resolveOfficialTarget({ phases: [{ to: 'https://evil.example' }], fallback: '/u/zenpak' }, { now: during }) === '/u/zenpak');
    ok('an outside fallback leads to the home page',
        await resolveOfficialTarget({ phases: [], fallback: '//evil.example' }, { now: during }) === '/');
    ok('a wrong date is skipped, not trusted',
        await resolveOfficialTarget({ phases: [{ until: 'soon', to: '/p/abc123' }], fallback: '/u/zenpak' }, { now: during }) === '/u/zenpak');

    // --- aliases ---
    const warnings = [];
    const valid = validOfficialLinks({
        huguetteraidnette: entry, 'Bad Name': entry, ab: entry, community: entry, broken: null,
    }, { reserved: new Set(['community']), warn: (m) => warnings.push(m) });
    ok('only the well-formed alias that no page uses is kept', valid.length === 1 && valid[0][0] === 'huguetteraidnette');
    ok('every refused alias is said in the log', warnings.length === 4);
    ok('no configuration gives no alias', validOfficialLinks(undefined).length === 0 && validOfficialLinks('x').length === 0);

    // --- the route ---
    const routes = {};
    const router = { get(path, handler) { routes[path] = handler; } };
    const registered = registerOfficialLinks(router, {
        links: { huguetteraidnette: entry }, reserved: new Set(), listIsServable: async () => true,
    });
    ok('the alias is a route of the site', registered.join() === 'huguetteraidnette' && typeof routes['/huguetteraidnette'] === 'function');
    const answer = await new Promise((resolve) => {
        const headers = {};
        const res = {
            set(name, value) { headers[name] = value; },
            redirect(status, location) { resolve({ status, location, headers }); },
        };
        // The real date decides: the list while it is before the end of the event.
        const realEntry = { ...entry, phases: [{ until: '2999-01-01', to: '/p/abc123' }] };
        const r2 = { get(path, handler) { handler({}, res); } };
        registerOfficialLinks(r2, { links: { huguetteraidnette: realEntry }, reserved: new Set(), listIsServable: async () => true });
    });
    ok('the answer is a temporary redirect', answer.status === 302);
    ok('it leads to the list', answer.location === '/p/abc123');
    ok('it is never kept by a browser', answer.headers['Cache-Control'] === 'no-store');
    ok('it is kept out of search engines', answer.headers['X-Robots-Tag'] === 'noindex');

    // A failing check never leaves the visitor with an error: the fallback answers.
    const failing = await new Promise((resolve) => {
        const res = { set() {}, redirect(status, location) { resolve({ status, location }); } };
        const r3 = { get(path, handler) { handler({}, res); } };
        registerOfficialLinks(r3, {
            links: { huguetteraidnette: { phases: [{ to: '/p/abc123' }], fallback: '/u/zenpak' } },
            reserved: new Set(),
            listIsServable: async () => { throw new Error('database down'); },
        });
    });
    ok('a failing check leads to the fallback', failing.status === 302 && failing.location === '/u/zenpak');

    console.log(`\nunit-official-links: ok (${passed})`);
    process.exit(0);
})().catch((error) => { console.error(error); process.exit(1); });
