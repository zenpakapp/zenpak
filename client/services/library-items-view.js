function filterLibraryItems(items, filters = {}) {
    const sourceItems = items || [];
    const search = String(filters.searchText || '').trim().toLowerCase();
    const category = String(filters.category || '').trim().toLowerCase();
    const tags = (filters.tags || []).map((tag) => String(tag).toLowerCase());

    if (!search && !category && tags.length === 0) return sourceItems;

    return sourceItems.filter((item) => {
        let itemTags = null;
        const getItemTags = () => {
            if (!itemTags) itemTags = (item.tags || []).map((tag) => String(tag).toLowerCase());
            return itemTags;
        };
        let matchesSearch = true;
        if (search) {
            matchesSearch = String(item.name || '').toLowerCase().includes(search)
                || String(item.brand || '').toLowerCase().includes(search)
                || String(item.description || '').toLowerCase().includes(search)
                || getItemTags().some((tag) => tag.includes(search));
        }
        const matchesCategory = !category || String(item.category || '').toLowerCase() === category;
        const matchesTags = tags.length === 0 || tags.every((tag) => getItemTags().includes(tag));
        return matchesSearch && matchesCategory && matchesTags;
    });
}

function calculateVirtualWindow(options = {}) {
    const items = options.items || [];
    const rowHeight = Math.max(1, Number(options.rowHeight) || 1);
    const viewportHeight = Math.max(0, Number(options.viewportHeight) || 0);
    const scrollTop = Math.max(0, Number(options.scrollTop) || 0);
    const overscan = Math.max(0, Number(options.overscan) || 0);
    const visibleStart = Math.floor(scrollTop / rowHeight);
    const visibleCount = Math.ceil(viewportHeight / rowHeight);
    const start = Math.min(items.length, Math.max(0, visibleStart - overscan));
    const end = Math.min(items.length, visibleStart + visibleCount + overscan);
    return {
        start,
        end,
        top: start * rowHeight,
        bottom: Math.max(0, (items.length - end) * rowHeight),
        items: items.slice(start, end),
    };
}

module.exports = { filterLibraryItems, calculateVirtualWindow };
