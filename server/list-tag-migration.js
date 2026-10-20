// The old list types mixed how long a trip is and what kind of trip it is: "Rando journée" is
// hiking over one day. A list now has two fields: `listTypes` is the activity, `durations` is
// how long. This turns the old values into the new ones, once, and is safe to run again.
const LEGACY_LIST_TYPES = ['day-hike', 'weekend', 'trek'];

const LEGACY_TO_TAGS = {
    'day-hike': { activity: 'hiking', duration: 'day' },
    weekend: { activity: 'hiking', duration: 'weekend' },
    trek: { activity: 'hiking', duration: 'multi-day' },
};

function unique(values) {
    return values.filter((value, index) => values.indexOf(value) === index);
}

function convertListTags(list) {
    const listTypes = list && Array.isArray(list.listTypes) ? list.listTypes : [];
    const durations = list && Array.isArray(list.durations) ? list.durations : [];

    const converted = [];
    const newDurations = [];
    let changed = false;
    listTypes.forEach((value) => {
        const legacy = LEGACY_TO_TAGS[value];
        if (!legacy) {
            converted.push(value);
            return;
        }
        changed = true;
        converted.push(legacy.activity);
        newDurations.push(legacy.duration);
    });

    return {
        listTypes: unique(converted),
        durations: unique([...durations, ...newDurations]),
        changed,
    };
}

// Converts the libraries of the users and the public lists. Both queries only match lists that
// still carry an old value, so a second run finds nothing to do.
async function migrateListTags(db) {
    const users = await db.collection('users').find({ 'library.lists.listTypes': { $in: LEGACY_LIST_TYPES } }).toArray();
    const userResults = await Promise.all(users.map(async (user) => {
        const lists = (user.library && user.library.lists) || [];
        let userChanged = false;
        const converted = lists.map((list) => {
            const result = convertListTags(list);
            if (!result.changed) return list;
            userChanged = true;
            return { ...list, listTypes: result.listTypes, durations: result.durations };
        });
        if (!userChanged) return 0;
        await db.collection('users').updateOne({ _id: user._id }, { $set: { 'library.lists': converted } });
        return 1;
    }));

    const publicLists = await db.collection('public_lists').find({ listTypes: { $in: LEGACY_LIST_TYPES } }).toArray();
    const publicResults = await Promise.all(publicLists.map(async (published) => {
        const result = convertListTags(published);
        if (!result.changed) return 0;
        await db.collection('public_lists').updateOne({ _id: published._id }, { $set: { listTypes: result.listTypes, durations: result.durations } });
        return 1;
    }));

    return {
        users: userResults.reduce((sum, count) => sum + count, 0),
        publicLists: publicResults.reduce((sum, count) => sum + count, 0),
    };
}

module.exports = { LEGACY_LIST_TYPES, convertListTags, migrateListTags };
