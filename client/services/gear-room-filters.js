function itemDisplayName(item) {
    return [item.brand, item.name].filter(Boolean).join(' ');
}

function sortValue(item, key) {
    if (key === 'weight') return item.weight || 0;
    if (key === 'price') return item.price || 0;
    if (key === 'starred') return item.starred ? 1 : 0;
    if (key === 'category') return (item.category || '').toLowerCase();
    return itemDisplayName(item).toLowerCase();
}

function buildSearchableItems(items) {
    return (items || []).map((item) => ({
        item,
        search: `${item.name || ''} ${item.description || ''} ${item.brand || ''}`.toLowerCase(),
    }));
}

function filterSearchableItems(searchableItems, query) {
    const q = String(query || '').toLowerCase();
    if (!q) return searchableItems.map((entry) => entry.item);
    return searchableItems.reduce((matches, entry) => {
        if (entry.search.includes(q)) matches.push(entry.item);
        return matches;
    }, []);
}

function sortItems(items, key, asc) {
    const decorated = (items || []).map((item) => ({
        item,
        value: sortValue(item, key),
    }));
    decorated.sort((a, b) => {
        const va = a.value;
        const vb = b.value;
        if (va < vb) return asc ? -1 : 1;
        if (va > vb) return asc ? 1 : -1;
        return 0;
    });
    return decorated.map((entry) => entry.item);
}

module.exports = {
    buildSearchableItems,
    filterSearchableItems,
    itemDisplayName,
    sortItems,
    sortValue,
};
