const db = require('./db.js');

// Writes some top-level fields of an account, and only those. A whole-document save from an older
// read would put back a library, plan, password or session that changed in between. A field that
// is undefined on the account is removed (the token index is unique, so null would collide).
// Takes an optional callback for the routes that still use one.
function writeFields(user, keys, callback) {
    const set = {};
    const unset = {};
    keys.forEach((key) => {
        if (typeof user[key] === 'undefined') unset[key] = '';
        else set[key] = user[key];
    });
    const update = {};
    if (Object.keys(set).length) update.$set = set;
    if (Object.keys(unset).length) update.$unset = unset;

    const operation = db.users.updateOne({ _id: user._id }, update);
    if (!callback) return operation;
    return operation.then(() => callback(null)).catch((err) => callback(err));
}

module.exports = { writeFields };
