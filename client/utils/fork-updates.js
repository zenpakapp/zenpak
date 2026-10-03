// CommonJS so test/unit-*.js can require it directly.
function findForkUpdate(list, updates) {
    if (!list || !list.forkedFrom || !Array.isArray(updates)) return null;
    const update = updates.find((entry) => entry && String(entry.listId) === String(list.id));
    if (!update || !(update.latestVersion > update.forkedVersion)) return null;
    const dismissedVersion = Number(list.forkedFrom.dismissedVersion) || 0;
    return update.latestVersion > dismissedVersion ? update : null;
}

module.exports = { findForkUpdate };
