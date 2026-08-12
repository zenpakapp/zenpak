const weightUtils = require('../utils/weight.js');

function normalizeQuantity(value) {
    const quantity = parseFloat(value);
    return Number.isNaN(quantity) ? 1 : quantity;
}

function normalizeText(value) {
    return (value || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

function copiedItemSignature(item) {
    return [
        normalizeText(item.name),
        normalizeText(item.description),
        normalizeText(item.brand),
        Math.round(Number(item.weight) || 0),
    ].join('|');
}

function createImportedItem(library, category, row) {
    const item = library.newItem({ category, _isNew: false });
    item.name = row.name;
    item.description = row.description;
    item.url = row.url;
    item.price = row.price;
    if (row.category) item.category = row.category;
    if (row.brand) item.brand = row.brand;
    if (row.imageUrl) item.imageUrl = row.imageUrl;
    item.weight = weightUtils.WeightToMg(parseFloat(row.weight), row.unit);
    item.authorUnit = library.itemUnit || row.unit;
    return item;
}

module.exports = {
    importCSV(state, importData) {
        const list = state.library.newList({});
        let category;
        const newCategories = {};
        let item;
        let categoryItem;
        let hasPrice = false;
        let hasWorn = false;
        let hasConsumable = false;
        let mergedCount = 0;
        let newCount = 0;
        const importedUnits = {};
        const previousItemUnit = state.library.itemUnit;

        list.name = importData.name;
        if (importData.listDescription) {
            list.description = importData.listDescription;
            state.library.optionalFields.listDescription = true;
        }

        importData.data.forEach((row) => {
            if (row.unit) importedUnits[row.unit] = (importedUnits[row.unit] || 0) + 1;

            if (newCategories[row.category]) {
                category = newCategories[row.category];
            } else {
                category = state.library.newCategory({ list });
                newCategories[row.category] = category;
            }
            category.name = row.category;

            const decision = row._match ? row._match.decision : 'new';

            if (decision === 'merge' && row._match.item) {
                item = state.library.getItemById(row._match.item.id);
                if (item) {
                    if (row.category && !item.category) item.category = row.category;
                    if (row.brand && !item.brand) item.brand = row.brand;
                    category.addItem({ itemId: item.id, _isNew: false, qty: normalizeQuantity(row.qty) });
                    mergedCount++;
                } else {
                    item = createImportedItem(state.library, category, row);
                    newCount++;
                }
            } else {
                item = createImportedItem(state.library, category, row);
                newCount++;
            }

            categoryItem = category.getCategoryItemById(item.id);
            if (categoryItem) {
                categoryItem.qty = normalizeQuantity(row.qty);
                categoryItem.worn = row.worn;
                categoryItem.consumable = row.consumable;
            }

            if (item.price) hasPrice = true;
            if (categoryItem && categoryItem.worn) hasWorn = true;
            if (categoryItem && categoryItem.consumable) hasConsumable = true;
        });

        if (hasPrice) state.library.optionalFields.price = true;
        if (hasWorn) state.library.optionalFields.worn = true;
        if (hasConsumable) state.library.optionalFields.consumable = true;

        state.library.defaultListId = list.id;
        state.library.getListById(list.id).calculateTotals();

        const unit = state.library.itemUnit;
        const alertKey = mergedCount > 0 ? 'import.csvMerged' : 'import.csvAdded';
        const alertParams = mergedCount > 0
            ? { merged: mergedCount, added: newCount, unit }
            : { count: newCount, unit };
        state.globalAlerts.push({ id: `${Date.now()}-${Math.random()}`, key: alertKey, params: alertParams });
    },
    importPublicList(state, { listName, description, categories, forkedFrom, seasons, listTypes, sourceCurrencySymbol }) {
        const list = state.library.newList();
        const sourceUsername = forkedFrom && forkedFrom.ownerUsername;
        const isExternalFork = sourceUsername && sourceUsername !== state.loggedIn;
        list.name = isExternalFork ? listName : `Copy of ${listName}`;
        list.description = description || '';
        list.forkedFrom = forkedFrom
            ? { ...forkedFrom, sourceCurrencySymbol: forkedFrom.sourceCurrencySymbol || sourceCurrencySymbol || '' }
            : null;
        list.seasons = Array.isArray(seasons) ? seasons.slice() : [];
        list.listTypes = Array.isArray(listTypes) ? listTypes.slice() : [];

        let mergedCount = 0;
        let newCount = 0;

        for (const catDef of (categories || [])) {
            const category = state.library.newCategory({ list, _isNew: false });
            category.name = catDef.name;

            for (const ci of (catDef.categoryItems || [])) {
                const signature = copiedItemSignature(ci);
                const existing = normalizeText(ci.name)
                    ? state.library.items.find(i => copiedItemSignature(i) === signature)
                    : null;

                let item;
                if (existing) {
                    item = existing;
                    category.addItem({ itemId: item.id, _isNew: false, qty: normalizeQuantity(ci.qty) });
                    mergedCount++;
                } else {
                    item = state.library.newItem({ category, _isNew: false });
                    item.name = ci.name || '';
                    item.description = ci.description || '';
                    const targetUnit = state.library.itemUnit || 'g';
                    item.weight = Number(ci.weight) || 0;
                    item.authorUnit = targetUnit;
                    item.price = Number(ci.price) || 0;
                    item.brand = ci.brand || '';
                    item.shop = ci.shop || '';
                    item.url = ci.url || '';
                    item.affiliateUrl = ci.affiliateUrl || '';
                    item.promoCode = ci.promoCode || '';
                    item.promoLabel = ci.promoLabel || '';
                    item.imageUrl = ci.imageUrl || '';
                    newCount++;
                }

                const categoryItem = category.getCategoryItemById(item.id);
                if (categoryItem) {
                    categoryItem.qty = normalizeQuantity(ci.qty);
                    categoryItem.worn = ci.worn || 0;
                    categoryItem.consumable = ci.consumable === true;
                    categoryItem.star = ci.star || 0;
                }
            }
        }

        state.library.defaultListId = list.id;
        list.calculateTotals();

        const unit = state.library.itemUnit || 'g';
        const alertKey = mergedCount > 0 ? 'import.listMerged' : 'import.listAdded';
        const alertParams = mergedCount > 0
            ? {
                mergedCount,
                addedCount: newCount,
                mergedLabelKey: mergedCount === 1 ? 'import.matchedOne' : 'import.matchedOther',
                addedLabelKey: newCount <= 1 ? 'import.newOne' : 'import.newOther',
                unit,
            }
            : {
                count: newCount,
                countLabelKey: newCount === 1 ? 'import.itemAddedOne' : 'import.itemAddedOther',
                unit,
            };
        state.globalAlerts.push({ id: `${Date.now()}-${Math.random()}`, key: alertKey, params: alertParams });
    },
};
