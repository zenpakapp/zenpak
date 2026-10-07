// CommonJS so test/unit-*.js can require it directly.
function findForkUpdate(list, updates) {
    if (!list || !list.forkedFrom || !Array.isArray(updates)) return null;
    const update = updates.find((entry) => entry && String(entry.listId) === String(list.id));
    if (!update || !(update.latestVersion > Math.max(update.forkedVersion, Number(list.forkedFrom.version) || 0))) return null;
    const dismissedVersion = Number(list.forkedFrom.dismissedVersion) || 0;
    return update.latestVersion > dismissedVersion ? update : null;
}

// After Undo the copy is behind its source again, but the update list fetched at load time may hold
// no entry for it (it was current then). Put the entry back locally; the server re-validates at the next load.
function withUndoneUpdate(updates, entry) {
    const current = Array.isArray(updates) ? updates : [];
    if (!entry || entry.listId === undefined || entry.listId === null) return current;
    return [...current.filter((existing) => !existing || String(existing.listId) !== String(entry.listId)), entry];
}

module.exports = { findForkUpdate, withUndoneUpdate };
