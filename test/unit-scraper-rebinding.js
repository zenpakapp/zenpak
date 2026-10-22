/**
 * Unit test: DNS rebinding against the scraper. The hostname answers with a public address to the
 * safety check, then with loopback to the connection; the connection must be refused and the local
 * server must never be reached.
 * Run with: node test/unit-scraper-rebinding.js
 */

'use strict';

const assert = require('assert');
const dnsCallback = require('dns');
const dnsPromises = require('dns').promises;
const http = require('http');

const { fetchHtml } = require('../server/gear-scraper.js');

let hits = 0;
const server = http.createServer((req, res) => {
    hits += 1;
    res.setHeader('Content-Type', 'text/html');
    res.end('<html>secret</html>');
});

// The safety check (promises API) sees a public address; the connection (callback API) sees loopback.
let port;
dnsPromises.lookup = async () => [{ address: '93.184.216.34', family: 4 }];
dnsCallback.lookup = (hostname, options, callback) => callback(null, [{ address: '127.0.0.1', family: 4 }]);

server.listen(0, '127.0.0.1', async () => {
    ({ port } = server.address());
    try {
        await assert.rejects(
            fetchHtml(`http://rebind.example:${port}/`),
            (err) => err.code === 'UNSAFE_URL',
            'the connection to a rebound address is refused',
        );
        assert.strictEqual(hits, 0, 'the local server was never reached');

        console.log('unit-scraper-rebinding: ok');
        server.close();
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
});
