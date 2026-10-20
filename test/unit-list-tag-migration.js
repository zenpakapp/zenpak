/**
 * Unit test: the old list types mixed a duration and an activity ("Rando journée" is hiking and
 * one day). They are now two fields: `listTypes` holds the activity, `durations` holds how long.
 * The conversion must be exact, keep everything else, and be safe to run again.
 * Run with: node test/unit-list-tag-migration.js
 */

'use strict';

const assert = require('assert');
const { convertListTags, LEGACY_LIST_TYPES, migrateListTags } = require('../server/list-tag-migration.js');

// The three old duration-like types become an activity and a duration.
assert.deepStrictEqual(convertListTags({ listTypes: ['day-hike'] }), {
    listTypes: ['hiking'], durations: ['day'], changed: true,
});
assert.deepStrictEqual(convertListTags({ listTypes: ['weekend'] }), {
    listTypes: ['hiking'], durations: ['weekend'], changed: true,
});
assert.deepStrictEqual(convertListTags({ listTypes: ['trek'] }), {
    listTypes: ['hiking'], durations: ['multi-day'], changed: true,
});

// Activities that were already activities are kept; the legacy value is replaced in place.
assert.deepStrictEqual(convertListTags({ listTypes: ['bikepacking', 'weekend'] }), {
    listTypes: ['bikepacking', 'hiking'], durations: ['weekend'], changed: true,
});
assert.deepStrictEqual(convertListTags({ listTypes: ['travel'] }), {
    listTypes: ['travel'], durations: [], changed: false,
});

// Two old values give two durations and one `hiking`, without duplicates.
assert.deepStrictEqual(convertListTags({ listTypes: ['weekend', 'trek'] }), {
    listTypes: ['hiking'], durations: ['weekend', 'multi-day'], changed: true,
});

// A list that already has durations keeps them.
assert.deepStrictEqual(convertListTags({ listTypes: ['trek'], durations: ['long-distance'] }), {
    listTypes: ['hiking'], durations: ['long-distance', 'multi-day'], changed: true,
});

// Unknown values are left alone, and so are lists with no tags or odd shapes.
assert.deepStrictEqual(convertListTags({ listTypes: ['thru-hike'] }), {
    listTypes: ['thru-hike'], durations: [], changed: false,
});
assert.deepStrictEqual(convertListTags({}), { listTypes: [], durations: [], changed: false });
assert.deepStrictEqual(convertListTags({ listTypes: 'trek' }), { listTypes: [], durations: [], changed: false });
assert.deepStrictEqual(convertListTags(null), { listTypes: [], durations: [], changed: false });

// Running it twice changes nothing the second time.
const once = convertListTags({ listTypes: ['day-hike', 'bikepacking'] });
const twice = convertListTags({ listTypes: once.listTypes, durations: once.durations });
assert.strictEqual(twice.changed, false);
assert.deepStrictEqual(twice.listTypes, once.listTypes);
assert.deepStrictEqual(twice.durations, once.durations);

assert.deepStrictEqual(LEGACY_LIST_TYPES, ['day-hike', 'weekend', 'trek']);

// The database pass converts the libraries of the users and the public lists, and counts them.
function fakeCollection(docs) {
    const updates = [];
    return {
        updates,
        find: () => ({ toArray: async () => docs }),
        updateOne: async (filter, update) => { updates.push({ filter, update }); },
    };
}
(async () => {
    const users = fakeCollection([
        {
            _id: 'u1',
            library: {
                lists: [
                    { id: 1, name: 'A', listTypes: ['weekend'] },
                    { id: 2, name: 'B', listTypes: ['bikepacking'] },
                ],
            },
        },
    ]);
    const publicLists = fakeCollection([{ _id: 'p1', listTypes: ['trek'] }]);
    const db = { collection: (name) => (name === 'users' ? users : publicLists) };

    const result = await migrateListTags(db);
    assert.deepStrictEqual(result, { users: 1, publicLists: 1 });
    assert.deepStrictEqual(users.updates[0].update.$set['library.lists'], [
        { id: 1, name: 'A', listTypes: ['hiking'], durations: ['weekend'] },
        { id: 2, name: 'B', listTypes: ['bikepacking'] },
    ]);
    assert.deepStrictEqual(publicLists.updates[0].update.$set, { listTypes: ['hiking'], durations: ['multi-day'] });

    console.log('ok');
})();
