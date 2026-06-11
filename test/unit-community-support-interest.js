// test/unit-community-support-interest.js
'use strict';

// Stub mailgun BEFORE loading router
let lastMailOptions = null;
let mailgunShouldThrow = false;

require.cache[require.resolve('../server/mailgun.js')] = {
    exports: {
        sendMail(opts) {
            lastMailOptions = opts;
            if (mailgunShouldThrow) return Promise.reject(new Error('Mailgun not configured'));
            return Promise.resolve({ id: 'stub-id' });
        },
    },
    id: require.resolve('../server/mailgun.js'),
    filename: require.resolve('../server/mailgun.js'),
    loaded: true, children: [], paths: [],
};

// Stub db
const dbStub = {
    users: { findOne() { return Promise.resolve(null); } },
    follows: { findMany() { return Promise.resolve([]); } },
};
require.cache[require.resolve('../server/db.js')] = {
    exports: dbStub, id: require.resolve('../server/db.js'),
    filename: require.resolve('../server/db.js'), loaded: true, children: [], paths: [],
};

// Stub auth
const authStub = { authenticateUser(req, res, cb) { cb(req, res, {}); } };
require.cache[require.resolve('../server/auth.js')] = {
    exports: authStub, id: require.resolve('../server/auth.js'),
    filename: require.resolve('../server/auth.js'), loaded: true, children: [], paths: [],
};

// Stub feed-events
const feedStub = { getFeedForUser: async () => ({ events: [], nextCursor: null }) };
require.cache[require.resolve('../server/feed-events.js')] = {
    exports: feedStub, id: require.resolve('../server/feed-events.js'),
    filename: require.resolve('../server/feed-events.js'), loaded: true, children: [], paths: [],
};

const router = require('../server/support-endpoints.js');

let passed = 0; let failed = 0;
function assert(desc, cond) {
    if (cond) { console.log(`  PASS  ${desc}`); passed++; }
    else { console.error(`  FAIL  ${desc}`); failed++; }
}

function makeReqRes(body) {
    let status = 200;
    let responseData;
    const req = { params: {}, query: {}, body };
    const res = {
        _status: 200,
        status(code) { status = code; this._status = code; return this; },
        json(data) { responseData = data; },
        getStatus() { return status; },
        getData() { return responseData; },
    };
    return { req, res };
}

async function callRoute(route, body) {
    const { req, res } = makeReqRes(body);
    await new Promise(resolve => {
        res.json = (data) => { res._data = data; resolve(); };
        route.route.stack[0].handle(req, res);
    });
    return { status: res._status, data: res._data };
}

async function run() {
    const interestRoute = router.stack.find(
        l => l.route && l.route.path === '/interest' && l.route.methods.post
    );
    assert('POST /interest route exists', Boolean(interestRoute));
    if (!interestRoute) {
        console.error('Skipping — route missing');
        console.log(`\n${passed} passed, ${failed} failed`);
        process.exit(1);
    }

    // Test 1: returns 400 if email missing
    {
        const { status } = await callRoute(interestRoute, { tier: 'trail' });
        assert('returns 400 if email missing', status === 400);
    }

    // Test 2: returns 400 if tier invalid
    {
        const { status } = await callRoute(interestRoute, { email: 'a@b.com', tier: 'premium' });
        assert('returns 400 if tier invalid', status === 400);
    }

    // Test 3: returns 400 if email malformed
    {
        const { status } = await callRoute(interestRoute, { email: 'notanemail', tier: 'trail' });
        assert('returns 400 if email malformed', status === 400);
    }

    // Test 4: returns 200 on valid input (trail tier)
    {
        lastMailOptions = null;
        const { status, data } = await callRoute(interestRoute, { email: 'a@b.com', tier: 'trail' });
        assert('returns 200 on valid input (trail)', status === 200);
        assert('response has ok:true', data && data.ok === true);
        assert('sendMail was called', lastMailOptions !== null);
        assert('mail subject contains tier and email', lastMailOptions && lastMailOptions.subject.includes('trail') && lastMailOptions.subject.includes('a@b.com'));
    }

    // Test 5: returns 200 on valid input (guide tier)
    {
        const { status } = await callRoute(interestRoute, { email: 'user@example.com', tier: 'guide' });
        assert('returns 200 on valid input (guide)', status === 200);
    }

    // Test 6: returns 200 even if mailgun throws (unconfigured in dev)
    {
        mailgunShouldThrow = true;
        const { status } = await callRoute(interestRoute, { email: 'a@b.com', tier: 'trail' });
        assert('returns 200 even when mailgun throws', status === 200);
        mailgunShouldThrow = false;
    }

    // Test 7: optional message is forwarded in mail body
    {
        lastMailOptions = null;
        await callRoute(interestRoute, { email: 'a@b.com', tier: 'guide', message: 'Hello there' });
        assert('message is included in mail text', lastMailOptions && lastMailOptions.text.includes('Hello there'));
    }

    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}
run().catch(e => { console.error(e); process.exit(1); });
