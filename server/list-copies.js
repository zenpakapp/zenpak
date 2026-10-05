const db = require('./db.js');

// Server-side record of which list versions a user actually copied. A fork's own
// forkedFrom.version is client-authored (saveLibrary does not validate it), so update and
// diff lookups only trust a version that appears here.

async function recordCopy(userId, externalId, version) {
    try {
        await db.listCopies.updateOne(
            { userId: String(userId), externalId, version },
            { $setOnInsert: { copiedAt: new Date() } },
            { upsert: true },
        );
    } catch (err) {
        // Two simultaneous copies of the same version race on the unique index; the row exists.
        if (err.code !== 11000) throw err;
    }
}

// Map of externalId -> Set of versions this user copied, for the given lists.
async function getCopiedVersions(userId, externalIds) {
    const copied = new Map();
    if (!externalIds.length) return copied;
    const rows = await db.listCopies.findMany({ userId: String(userId), externalId: { $in: externalIds } });
    rows.forEach((row) => {
        if (!copied.has(row.externalId)) copied.set(row.externalId, new Set());
        copied.get(row.externalId).add(row.version);
    });
    return copied;
}

function hasCopiedVersion(copied, externalId, version) {
    const versions = copied.get(externalId);
    return Boolean(versions && versions.has(version));
}

module.exports = { recordCopy, getCopiedVersions, hasCopiedVersion };
