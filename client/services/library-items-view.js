'use strict';

function filterLibraryItems(items, filters = {}, activeItemIds = []) {
    const search = String(filters.searchText || '').trim().toLowerCase();
    const category = String(filters.category || '').trim().toLowerCase();
    const tags = (filters.tags || []).map(tag => String(tag).toLowerCase());
    const activeIds = new Set(activeItemIds.map(String));

    return (items || []).filter((item) => {
        const matchesSearch = !search
            || String(item.name || '').toLowerCase().includes(search)
            || String(item.description || '').toLowerCase().includes(search);
        const matchesCategory = !category || String(item.category || '').toLowerCase() === category;
        const itemTags = (item.tags || []).map(tag => String(tag).toLowerCase());
        const matchesTags = tags.every(tag => itemTags.includes(tag));
        return matchesSearch && matchesCategory && matchesTags;
    }).map(item => ({
        ...item,
        inCurrentList: activeIds.has(String(item.id)),
    }));
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
