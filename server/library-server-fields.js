// Library fields the server owns. A client library arrives through /saveLibrary, /api/restore and
// /register; none of them may set these, so each path pins them to what is stored (or to nothing
// for a new account).

const SERVER_OWNED_KEYS = ['entitlements', 'creator', 'insights'];

function pinServerOwnedFields(library, stored) {
    const server = stored || {};
    SERVER_OWNED_KEYS.forEach((key) => {
        if (server[key]) library[key] = key === 'insights' ? server[key] : { ...server[key] };
        else delete library[key];
    });
    if (server.publicProfile) library.publicProfile = { ...server.publicProfile };

    // `featured` is set by moderators only.
    const featuredIds = new Set((server.lists || []).filter((l) => l.featured).map((l) => String(l.id)));
    (library.lists || []).forEach((list) => {
        if (featuredIds.has(String(list.id))) list.featured = true;
        else delete list.featured;
    });
    return library;
}

module.exports = { pinServerOwnedFields };
