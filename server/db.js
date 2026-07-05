const { MongoClient, ObjectId } = require('mongodb');
const config = require('config');

const url = `mongodb://${config.get('databaseUrl')}`;
const dbName = config.get('databaseUrl').split('/').pop();

let _db = null;
const _client = new MongoClient(url);

async function connect() {
    await _client.connect();
    _db = _client.db(dbName);
}

const ready = connect();

ready.catch((err) => {
    console.error('MongoDB connection failed:', err);
    process.exit(1);
});

function normalizeId(value) {
    return typeof value === 'string' ? new ObjectId(value) : value;
}

function getCollection(name) {
    return ready.then(() => _db.collection(name));
}

function collection(name) {
    function deleteOne(filter) {
        return getCollection(name)
            .then((mongoCollection) => mongoCollection.deleteOne(filter._id ? { _id: normalizeId(filter._id) } : filter));
    }

    function deleteMany(filter) {
        return getCollection(name)
            .then((mongoCollection) => mongoCollection.deleteMany(filter));
    }

    return {
        find(query, callback) {
            if (!callback) {
                throw new TypeError('db.collection.find requires a callback. Use findMany for promise-based reads.');
            }

            return getCollection(name)
                .then((mongoCollection) => mongoCollection.find(query).toArray())
                .then((docs) => callback(null, docs))
                .catch((err) => callback(err, null));
        },
        findMany(query) {
            return getCollection(name)
                .then((mongoCollection) => mongoCollection.find(query).toArray());
        },
        findSorted(query, sort, limit) {
            return getCollection(name)
                .then((mongoCollection) => mongoCollection.find(query).sort(sort).limit(limit).toArray());
        },
        findOne(query, callback) {
            const op = getCollection(name)
                .then((mongoCollection) => mongoCollection.findOne(query));

            if (!callback) {
                return op;
            }

            return op
                .then((doc) => callback(null, doc))
                .catch((err) => callback(err, null));
        },
        save(doc, callback) {
            const { _id, ...rest } = doc;
            const filter = _id ? { _id: normalizeId(_id) } : { _id: new ObjectId() };
            const setFields = {};
            const unsetFields = {};
            for (const [k, v] of Object.entries(rest)) {
                if (v === undefined) unsetFields[k] = '';
                else setFields[k] = v;
            }
            const update = Object.keys(unsetFields).length
                ? { $set: setFields, $unset: unsetFields }
                : { $set: setFields };
            const options = { upsert: true, returnDocument: 'after' };

            const op = getCollection(name)
                .then((mongoCollection) => mongoCollection.findOneAndUpdate(filter, update, options))
                .then((result) => {
                    if (!doc._id && result && result._id) doc._id = result._id;
                    if (callback) callback(null, result);
                    return result;
                });

            if (!callback) {
                op.catch(() => {});
                return op;
            }

            return op.catch((err) => {
                callback(err);
                return null;
            });
        },
        aggregate(pipeline) {
            return getCollection(name)
                .then((mongoCollection) => mongoCollection.aggregate(pipeline).toArray());
        },
        updateOne(filter, update) {
            return getCollection(name).then(col => col.updateOne(filter, update));
        },
        updateMany(filter, update) {
            return getCollection(name).then(col => col.updateMany(filter, update));
        },
        deleteOne(filter) {
            return deleteOne(filter);
        },
        deleteMany(filter) {
            return deleteMany(filter);
        },
        remove(doc, justOne, callback) {
            const filter = doc._id ? { _id: normalizeId(doc._id) } : doc;
            const op = justOne ? deleteOne(filter) : deleteMany(filter);

            if (!callback) {
                op.catch(() => {});
                return op;
            }

            return op
                .then((result) => {
                    callback(null, result);
                    return result;
                })
                .catch((err) => {
                    callback(err);
                    return null;
                });
        },
    };
}

module.exports = {
    ready,
    users: collection('users'),
    libraries: collection('libraries'),
    follows: collection('follows'),
    feedEvents: collection('feed_events'),
    notifications: collection('notifications'),
    reports: collection('reports'),
    billingEvents: collection('billing_events'),
    async ensureIndexes() {
        await ready;
        // createIndex is not exposed by the wrapper — use raw _db collections directly
        const users = _db.collection('users');
        await users.createIndex({ token: 1 }, { unique: true, sparse: true });
        await users.createIndex({ username: 1 }, { unique: true });
        await users.createIndex({ 'library.lists.externalId': 1 }, { sparse: true });

        const follows = _db.collection('follows');
        await follows.createIndex({ followerId: 1, followedId: 1 }, { unique: true });
        await follows.createIndex({ followedId: 1 });

        const events = _db.collection('feed_events');
        await events.createIndex({ userId: 1, createdAt: -1 });
        await events.createIndex({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

        const notifications = _db.collection('notifications');
        await notifications.createIndex({ userId: 1, createdAt: -1 });
        await notifications.createIndex({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

        const reports = _db.collection('reports');
        await reports.createIndex({ reporterId: 1, targetType: 1, targetId: 1 }, { unique: true });
        await reports.createIndex({ status: 1, createdAt: -1 });

        const billingEvents = _db.collection('billing_events');
        await billingEvents.createIndex({ stripeEventId: 1 }, { unique: true, sparse: true, name: 'billing_events_stripeEventId_unique' });
        await billingEvents.createIndex({ kofiTransactionId: 1 }, { unique: true, sparse: true, name: 'billing_events_kofiTransactionId_unique' });

        await users.createIndex({ 'billing.customerId': 1 }, { unique: true, sparse: true, name: 'users_billing_customerId_unique' });
    },
};
