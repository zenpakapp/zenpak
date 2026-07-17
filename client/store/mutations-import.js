const weightUtils = require('../utils/weight.js');

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
                    category.addItem({ itemId: item.id, _isNew: false, qty: parseFloat(row.qty) || 1 });
                    mergedCount++;
                } else {
                    item = state.library.newItem({ category, _isNew: false });
                    item.name = row.name;
                    item.description = row.description;
                    item.url = row.url;
                    item.price = row.price;
                    if (row.category) item.category = row.category;
                    if (row.brand) item.brand = row.brand;
                    if (row.imageUrl) item.imageUrl = row.imageUrl;
                    item.weight = weightUtils.WeightToMg(parseFloat(row.weight), row.unit);
                    item.authorUnit = state.library.itemUnit || row.unit;
                    newCount++;
                }
            } else {
                const rowNameLower = (row.name || '').toLowerCase().trim();
                const existing = rowNameLower
                    ? state.library.items.find(i => (i.name || '').toLowerCase().trim() === rowNameLower)
                    : null;
                if (existing) {
                    item = existing;
                    category.addItem({ itemId: item.id, _isNew: false, qty: parseFloat(row.qty) || 1 });
                    mergedCount++;
                } else {
                    item = state.library.newItem({ category, _isNew: false });
                    item.name = row.name;
                    item.description = row.description;
                    item.url = row.url;
                    item.price = row.price;
                    if (row.category) item.category = row.category;
                    if (row.brand) item.brand = row.brand;
                    if (row.imageUrl) item.imageUrl = row.imageUrl;
                    item.weight = weightUtils.WeightToMg(parseFloat(row.weight), row.unit);
                    item.authorUnit = state.library.itemUnit || row.unit;
                    newCount++;
                }
            }

            categoryItem = category.getCategoryItemById(item.id);
            if (categoryItem) {
                categoryItem.qty = parseFloat(row.qty) || 1;
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
    importPublicList(state, { listName, description, categories, forkedFrom }) {
        const list = state.library.newList();
        list.name = `Copy of ${listName}`;
        list.description = description || '';
        list.forkedFrom = forkedFrom || null;

        let mergedCount = 0;
        let newCount = 0;

        for (const catDef of (categories || [])) {
            const category = state.library.newCategory({ list, _isNew: false });
            category.name = catDef.name;

            for (const ci of (catDef.categoryItems || [])) {
                const nameLower = (ci.name || '').toLowerCase().trim();
                const existing = nameLower
                    ? state.library.items.find(i => (i.name || '').toLowerCase().trim() === nameLower)
                    : null;

                let item;
                if (existing) {
                    item = existing;
                    category.addItem({ itemId: item.id, _isNew: false, qty: ci.qty || 1 });
                    mergedCount++;
                } else {
                    item = state.library.newItem({ category, _isNew: false });
                    item.name = ci.name || '';
                    item.description = ci.description || '';
                    item.weight = Number(ci.weight) || 0;
                    item.authorUnit = state.library.itemUnit || ci.authorUnit || 'g';
                    item.price = Number(ci.price) || 0;
                    item.brand = ci.brand || '';
                    item.shop = ci.shop || '';
                    item.imageUrl = ci.imageUrl || '';
                    newCount++;
                }

                const categoryItem = category.getCategoryItemById(item.id);
                if (categoryItem) {
                    categoryItem.qty = ci.qty || 1;
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
            ? { merged: mergedCount, added: newCount, unit }
            : { count: newCount, unit };
        state.globalAlerts.push({ id: `${Date.now()}-${Math.random()}`, key: alertKey, params: alertParams });
    },
    save() {
        // no-op
    },
};
