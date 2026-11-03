// CommonJS so test/unit-*.js can require it. Pure: no store, no DOM, no network.
// The Wayfarer "Items" section edits affiliate overrides that live on the library item, not on the
// list: an item used by several public lists is one row here, whatever the number of lists.
const OVERRIDE_FIELDS = ['affiliateUrl', 'promoCode', 'promoLabel'];

const snapshot = (row) => OVERRIDE_FIELDS.reduce((saved, field) => ({ ...saved, [field]: row[field] }), {});

// groups: the /api/guide/items payload, one entry per public list.
function buildItemRows(groups) {
    const rows = new Map();
    (groups || []).forEach((group) => {
        (group.items || []).forEach((item) => {
            const list = { listId: group.listId, listName: group.listName };
            if (rows.has(item.itemId)) {
                rows.get(item.itemId).lists.push(list);
                return;
            }
            const row = {
                itemId: item.itemId,
                name: item.name || '',
                brand: item.brand || '',
                appliedRule: item.appliedRule || null,
                lists: [list],
                affiliateUrl: item.affiliateUrl || '',
                promoCode: item.promoCode || '',
                promoLabel: item.promoLabel || '',
            };
            row.saved = snapshot(row);
            rows.set(item.itemId, row);
        });
    });
    return [...rows.values()];
}

const isChanged = (row) => OVERRIDE_FIELDS.some((field) => row[field] !== row.saved[field]);

// Only the rows the user edited are sent. The server checks the item is in the named public list.
function changedUpdates(rows) {
    return rows.filter(isChanged).map((row) => ({
        listId: row.lists[0].listId,
        itemId: row.itemId,
        affiliateUrl: row.affiliateUrl,
        promoCode: row.promoCode,
        promoLabel: row.promoLabel,
    }));
}

function markSaved(rows) {
    rows.forEach((row) => { row.saved = snapshot(row); });
}

const hasOverride = (row) => OVERRIDE_FIELDS.some((field) => String(row[field] || '').trim() !== '');

// mode: all | todo (nothing set, no rule covers it) | filled | rule
function filterRows(rows, { query = '', listId = '', mode = 'all' } = {}) {
    const needle = String(query).trim().toLowerCase();
    return rows.filter((row) => {
        if (listId && !row.lists.some((list) => list.listId === listId)) return false;
        if (needle && !`${row.name} ${row.brand}`.toLowerCase().includes(needle)) return false;
        if (mode === 'todo') return !hasOverride(row) && !row.appliedRule;
        if (mode === 'filled') return hasOverride(row);
        if (mode === 'rule') return Boolean(row.appliedRule);
        return true;
    });
}

module.exports = {
    buildItemRows, changedUpdates, markSaved, filterRows,
};
