function buildListItemIds(library, list) {
    const ids = new Set();
    if (!library || !list) return ids;

    list.categoryIds.forEach((catId) => {
        const cat = library.getCategoryById(catId);
        if (!cat) return;
        cat.categoryItems.forEach((ci) => ids.add(ci.itemId));
    });

    return ids;
}

function buildItemUsageCounts(library) {
    const counts = new Map();
    if (!library) return counts;

    library.lists.forEach((list) => {
        buildListItemIds(library, list).forEach((itemId) => {
            counts.set(itemId, (counts.get(itemId) || 0) + 1);
        });
    });

    return counts;
}

module.exports = { buildListItemIds, buildItemUsageCounts };
