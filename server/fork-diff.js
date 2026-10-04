const db = require('./db.js');
const { isPublicVisibility } = require('../client/services/public-visibility.js');
const { buildPublicList } = require('./public-sharing.js');
const { diffSnapshots } = require('./list-diff.js');
const {
    getLatest, getVersion, buildServedUser, findLiveList, isTrackedFork,
} = require('./list-versions.js');

// What changed in the source between the version this fork was copied from and the latest.
// Bound to the caller's own fork: the base version comes from its forkedFrom, never from input.
// Both versions go through buildPublicList with the author's live share settings, so anything
// hidden publicly is hidden here too. Null (404) whenever the source is not currently public.
async function getForkDiff(user, listId) {
    const lists = (user && user.library && user.library.lists) || [];
    const fork = lists.find((list) => String(list.id) === String(listId));
    if (!isTrackedFork(fork)) return null;
    const { externalId, version: forkedVersion, ownerId: copiedOwnerId } = fork.forkedFrom;

    const latest = await getLatest(externalId);
    if (!latest) return null;
    // externalId is client-authored and can be reused after an account deletion: only diff
    // against the account this list was actually copied from.
    if (!copiedOwnerId || String(copiedOwnerId) !== String(latest.ownerId)) return null;
    const owner = await db.users.findOne({ _id: latest.ownerId });
    const liveList = owner ? findLiveList(owner, externalId) : null;
    if (!liveList || !isPublicVisibility(liveList.visibility)) return null;

    const base = await getVersion(externalId, forkedVersion);
    if (!base || String(base.ownerId) !== String(latest.ownerId)) return null;

    const basePayload = buildPublicList(buildServedUser(owner, liveList, base), externalId);
    const latestPayload = buildPublicList(buildServedUser(owner, liveList, latest), externalId);
    if (!basePayload || !latestPayload) return null;

    return {
        sourceExternalId: externalId,
        fromVersion: base.version,
        toVersion: latest.version,
        currencySymbol: latestPayload.currencySymbol,
        diff: diffSnapshots(basePayload, latestPayload),
    };
}

module.exports = { getForkDiff };
