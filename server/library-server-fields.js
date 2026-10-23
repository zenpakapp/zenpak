// Library fields the server owns. A client library arrives through /saveLibrary, /api/restore and
// /register; none of them may set these, so each path pins them to what is stored (or to nothing
// for a new account).

const SERVER_OWNED_KEYS = ['entitlements', 'creator', 'insights'];

// The server makes the public id of a list (/externalId: lowercase letters and digits). It is written
// into page addresses and into the script of the embed page, so a client library cannot bring its own.
const EXTERNAL_ID_PATTERN = /^[a-z0-9]{1,32}$/;

function isValidExternalId(value) {
    return typeof value === 'string' && EXTERNAL_ID_PATTERN.test(value);
}

function pinServerOwnedFields(library, stored) {
    const server = stored || {};
    SERVER_OWNED_KEYS.forEach((key) => {
        if (server[key]) library[key] = key === 'insights' ? server[key] : { ...server[key] };
        else delete library[key];
    });
    if (server.publicProfile) library.publicProfile = { ...server.publicProfile };

    // `featured` and `takenDown` are set by moderators only. A list taken down stays private until
    // a moderator lifts it.
    // Matched by the list id and by externalId: the id is client-chosen, but the public link, the
    // moderation routes and publishing all work on externalId.
    const keysWith = (flag) => {
        const keys = new Set();
        (server.lists || []).filter((l) => l[flag]).forEach((l) => {
            keys.add(`id:${l.id}`);
            if (l.externalId) keys.add(`ext:${l.externalId}`);
        });
        return keys;
    };
    const flagged = (keys, list) => keys.has(`id:${list.id}`) || (list.externalId && keys.has(`ext:${list.externalId}`));
    const featuredKeys = keysWith('featured');
    const takenDownKeys = keysWith('takenDown');
    (library.lists || []).forEach((list) => {
        if (typeof list.externalId !== 'undefined' && !isValidExternalId(list.externalId)) delete list.externalId;
        if (flagged(featuredKeys, list)) list.featured = true;
        else delete list.featured;
        if (flagged(takenDownKeys, list)) {
            list.takenDown = true;
            list.visibility = 'private';
        } else {
            delete list.takenDown;
        }
    });
    return library;
}

module.exports = { pinServerOwnedFields, isValidExternalId };
