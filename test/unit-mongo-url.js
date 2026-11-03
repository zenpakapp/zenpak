/**
 * Unit test: databaseUrl accepts the legacy "host/db" form and a full managed-database connection string.
 * Run with: node test/unit-mongo-url.js
 */

'use strict';

const assert = require('assert');
const { parseDatabaseUrl } = require('../server/mongo-url.js');

assert.deepStrictEqual(parseDatabaseUrl('localhost/lighterpack'), { url: 'mongodb://localhost/lighterpack', dbName: 'lighterpack' });

const managed = 'mongodb+srv://doadmin:p%40ss@db-mongodb-fra1-1234.mongo.ondigitalocean.com/zenpak?tls=true&authSource=admin&replicaSet=db';
assert.deepStrictEqual(parseDatabaseUrl(managed), { url: managed, dbName: 'zenpak' });

const plain = 'mongodb://user:secret@10.0.0.5:27017,10.0.0.6:27017/zenpak?replicaSet=rs0';
assert.deepStrictEqual(parseDatabaseUrl(plain), { url: plain, dbName: 'zenpak' });

assert.strictEqual(parseDatabaseUrl('mongodb://localhost:27017/zenpak').dbName, 'zenpak', 'no options');
assert.throws(() => parseDatabaseUrl('mongodb://localhost:27017'), /no database name/, 'a connection string without a database name is refused');
assert.throws(() => parseDatabaseUrl('mongodb://localhost:27017/?tls=true'), /no database name/);

console.log('unit-mongo-url: ok');
