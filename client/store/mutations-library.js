const { arrayMove } = require('../utils/utils');
const { applyUpdate, undoUpdate } = require('../utils/fork-apply.js');

function recalculateListsForItem(library, itemId) {
    const affectedCategoryIds = new Set();

    library.categories.forEach((category) => {
        if (!category) return;
        if (category.categoryItems.some((categoryItem) => categoryItem.itemId === itemId)) {
            affectedCategoryIds.add(category.id);
        }
    });

    if (affectedCategoryIds.size === 0) return;

    library.lists.forEach((list) => {
        if (list.categoryIds.some((categoryId) => affectedCategoryIds.has(categoryId))) {
            list.calculateTotals();
        }
    });
}

function recalculateListForCategory(library, category) {
    if (!category) return;
    const list = library.findListWithCategoryById(category.id);
    if (list) list.calculateTotals();
}

module.exports = {
    setDefaultList(state, list) {
        state.library.defaultListId = list.id;
        state.library.getListById(state.library.defaultListId).calculateTotals();
    },
    setTotalUnit(state, unit) { state.library.totalUnit = unit; },
    setDefaultUnits(state, units) {
        if (units.itemUnit) state.library.itemUnit = units.itemUnit;
        if (units.totalUnit) state.library.totalUnit = units.totalUnit;
    },
    toggleOptionalField(state, optionalField) {
        state.library.optionalFields[optionalField] = !state.library.optionalFields[optionalField];
        state.library.getListById(state.library.defaultListId).calculateTotals();
    },
    updateCurrencySymbol(state, currencySymbol) { state.library.currencySymbol = currencySymbol; },
    // A mutation returns nothing, so the object it creates is left on its payload as `created`
    // (services/library-creation.js reads it back): nobody looks for the new Item by its position.
    newItem(state, payload) {
        const { category, _isNew, name } = payload;
        const item = state.library.newItem({ category, _isNew });
        if (name) item.name = name;
        recalculateListForCategory(state.library, category);
        payload.created = state.library.getItemById(item.id);
    },
    newCategory(state, list) {
        state.library.newCategory({ list, _isNew: true });
        if (list) list.calculateTotals();
    },
    newList(state) {
        const list = state.library.newList();
        state.library.newCategory({ list });
        list.calculateTotals();
        state.library.defaultListId = list.id;
    },
    newListNamed(state, payload) {
        const list = state.library.newList();
        list.name = payload.name || 'New list';
        state.library.newCategory({ list });
        list.calculateTotals();
        payload.created = state.library.getListById(list.id);
    },
    duplicateItem(state, payload) {
        const { item } = payload;
        const copy = state.library.newItem({});
        const fields = ['name', 'description', 'weight', 'authorUnit', 'price', 'image', 'imageUrl', 'url', 'shop', 'affiliateUrl', 'promoCode', 'promoLabel', 'brand', 'category', 'tags', 'starred'];
        fields.forEach((f) => {
            if (item[f] !== undefined) copy[f] = Array.isArray(item[f]) ? [...item[f]] : item[f];
        });
        state.library.updateItem(copy);
        payload.created = state.library.getItemById(copy.id);
    },
    removeItem(state, item) {
        if (state.library.removeItem(item.id)) {
            state.library.lists.forEach((list) => list.calculateTotals());
        }
    },
    removeCategory(state, category) {
        const removed = state.library.removeCategory(category.id);
        if (removed === false) {
            state.globalAlerts.push({
                id: `${Date.now()}-${Math.random()}`,
                message: "Can't remove the last category in a list!",
            });
        }
    },
    removeList(state, { list, removeUnusedItems }) { state.library.removeList(list.id, { removeUnusedItems }); },
    reorderList(state, args) {
        state.library.lists = arrayMove(state.library.lists, args.before, args.after);
    },
    reorderCategory(state, args) {
        const list = state.library.getListById(args.list.id);
        list.categoryIds = arrayMove(list.categoryIds, args.before, args.after);
        list.calculateTotals();
    },
    reorderItem(state, args) {
        const item = state.library.getItemById(args.itemId);
        const dropCategory = state.library.getCategoryById(args.categoryId);
        const list = state.library.getListById(args.list.id);
        const originalCategory = state.library.findCategoryWithItemById(item.id, list.id);
        const oldCategoryItem = originalCategory.getCategoryItemById(item.id);
        const oldIndex = originalCategory.categoryItems.indexOf(oldCategoryItem);
        if (originalCategory === dropCategory) {
            dropCategory.categoryItems = arrayMove(dropCategory.categoryItems, oldIndex, args.dropIndex);
        } else {
            originalCategory.categoryItems.splice(oldIndex, 1);
            dropCategory.categoryItems.splice(args.dropIndex, 0, oldCategoryItem);
        }
        list.calculateTotals();
    },
    addItemToCategory(state, args) {
        const item = state.library.getItemById(args.itemId);
        const dropCategory = state.library.getCategoryById(args.categoryId);
        if (item && dropCategory) {
            // An Item already in the Category keeps its Placement; the drop only moves it to dropIndex.
            const categoryItem = dropCategory.addItem({ itemId: item.id, qty: args.optional ? 0 : 1 });
            const categoryItemIndex = dropCategory.categoryItems.indexOf(categoryItem);
            if (categoryItem && categoryItemIndex !== -1) {
                dropCategory.categoryItems = arrayMove(dropCategory.categoryItems, categoryItemIndex, args.dropIndex);
            }
            recalculateListForCategory(state.library, dropCategory);
        }
    },
    createCategoryAndAddItem(state, args) {
        const listId = args.listId || state.library.defaultListId;
        const list = state.library.getListById(listId);
        const item = state.library.getItemById(args.itemId);
        const name = String(args.name || '').trim();
        if (!list || !item || !name) return;
        const existingCategory = list.categoryIds
            .map((id) => state.library.getCategoryById(id))
            .find((category) => category && String(category.name || '').trim().toLowerCase() === name.toLowerCase());
        const category = existingCategory || state.library.newCategory({ list });
        category.name = existingCategory ? existingCategory.name : name;
        category.addItem({ itemId: item.id, qty: args.optional ? 0 : 1 });
        list.calculateTotals();
    },
    updateListName(state, updatedList) {
        const list = state.library.getListById(updatedList.id);
        list.name = updatedList.name;
    },
    updateListDescription(state, updatedList) {
        const list = state.library.getListById(updatedList.id);
        list.description = updatedList.description;
    },
    updateListDiscoveryTags(state, args) {
        const list = state.library.getListById(args.listId);
        if (list) {
            list.seasons = Array.isArray(args.seasons) ? args.seasons : [];
            list.listTypes = Array.isArray(args.listTypes) ? args.listTypes : [];
            list.durations = Array.isArray(args.durations) ? args.durations : [];
        }
    },
    updatePublicProfile(state, profile) {
        state.library.publicProfile = { ...state.library.publicProfile, ...profile };
    },
    updateListVisibility(state, args) {
        const list = state.library.getListById(args.listId);
        if (list) {
            list.visibility = args.visibility;
            list.allowSearchIndexing = args.allowSearchIndexing === true;
        }
    },
    updateListCopyable(state, args) {
        const list = state.library.getListById(args.listId);
        if (list) {
            list.copyable = args.copyable === true;
        }
    },
    updateListPublicFields(state, args) {
        const list = state.library.getListById(args.listId);
        if (list) {
            if (!list.publicFields) list.publicFields = {};
            if (typeof args.price !== 'undefined') list.publicFields.price = args.price;
            if (typeof args.links !== 'undefined') list.publicFields.links = args.links;
            if (typeof args.images !== 'undefined') list.publicFields.images = args.images;
            if (typeof args.downloadable !== 'undefined') list.publicFields.downloadable = args.downloadable;
        }
    },
    updateItemCreatorLink(state, args) {
        const item = state.library.getItemById(args.itemId);
        if (item) {
            item.affiliateUrl = args.affiliateUrl || '';
            item.promoCode = args.promoCode || '';
            item.promoLabel = args.promoLabel || '';
            item.shop = args.shop || item.shop || '';
        }
    },
    hideSourceListInfo(state, args) {
        const list = state.library.getListById(args.listId);
        if (!list) return 0;
        list.sourceListInfoHidden = true;
        list.sourceListInfoActionDismissed = true;

        let count = 0;
        list.categoryIds.forEach((categoryId) => {
            const category = state.library.getCategoryById(categoryId);
            if (!category) return;

            category.categoryItems.forEach((categoryItem) => {
                const item = state.library.getItemById(categoryItem.itemId);
                if (!item || !(item.affiliateUrl || item.promoCode || item.promoLabel)) return;

                item.affiliateUrl = '';
                item.promoCode = '';
                item.promoLabel = '';
                state.library.updateItem(item);
                count++;
            });
        });

        return count;
    },
    dismissSourceListInfoAction(state, args) {
        const list = state.library.getListById(args.listId);
        if (!list) return;
        list.sourceListInfoActionDismissed = true;
    },
    updateCreatorSettings(state, creator) {
        state.library.creator = { ...state.library.creator, ...creator };
    },
    setExternalId(state, args) {
        const list = state.library.getListById(args.list.id);
        list.externalId = args.externalId;
    },
    dismissForkUpdate(state, { listId, version }) {
        const list = state.library.getListById(listId);
        if (!list || !list.forkedFrom) return;
        list.forkedFrom = { ...list.forkedFrom, dismissedVersion: version };
    },
    applyForkUpdate(state, {
        listId, base, latest, toVersion,
    }) {
        const list = state.library.getListById(listId);
        if (!list || !list.forkedFrom) return;
        // Never apply a payload fetched for another list (the user may have switched lists).
        const payloadSource = latest && latest.list && latest.list.externalId;
        if (!payloadSource || String(payloadSource) !== String(list.forkedFrom.externalId)) return;
        applyUpdate(state.library, list, base, latest, toVersion);
    },
    undoForkUpdate(state, { listId }) {
        const list = state.library.getListById(listId);
        if (!list) return;
        undoUpdate(state.library, list);
    },
    discardForkUndo(state, { listId }) {
        const list = state.library.getListById(listId);
        if (!list || !list.forkedFrom || !list.forkedFrom.undo) return;
        const { undo, ...rest } = list.forkedFrom;
        list.forkedFrom = rest;
    },
    updateCategoryName(state, updatedCategory) {
        const category = state.library.getCategoryById(updatedCategory.id);
        category.name = updatedCategory.name;
    },
    updateCategoryColor(state, updatedCategory) {
        const category = state.library.getCategoryById(updatedCategory.id);
        category.color = updatedCategory.color;
    },
    updateItem(state, item) {
        state.library.updateItem(item);
        recalculateListsForItem(state.library, item.id);
    },
    updateItemMetadata(state, item) {
        state.library.updateItem(item);
    },
    updateItemsMetadata(state, items) {
        if (!Array.isArray(items) || items.length === 0) return;
        items.forEach((item) => {
            state.library.updateItem(item);
        });
    },
    mergeItems(state, { keepId, removeId }) {
        state.library.lists.forEach((list) => {
            list.categoryIds.forEach((categoryId) => {
                const category = state.library.getCategoryById(categoryId);
                if (!category) return;
                const removeCI = category.getCategoryItemById(removeId);
                if (!removeCI) return;
                const keepCI = category.getCategoryItemById(keepId);
                if (keepCI) {
                    keepCI.qty = (Number(keepCI.qty) || 0) + (Number(removeCI.qty) || 0);
                    keepCI.worn = keepCI.worn || removeCI.worn;
                    keepCI.consumable = keepCI.consumable || removeCI.consumable;
                    keepCI.star = Math.max(Number(keepCI.star) || 0, Number(removeCI.star) || 0);
                    category.removeItem(removeId);
                } else {
                    removeCI.itemId = keepId;
                }
            });
        });
        const removeItem = state.library.getItemById(removeId);
        if (removeItem) {
            state.library.items.splice(state.library.items.indexOf(removeItem), 1);
            delete state.library.idMap[removeId];
        }
        state.library.lists.forEach((list) => list.calculateTotals());
    },
    updateItemLink(state, args) {
        const item = state.library.getItemById(args.item.id);
        item.url = args.url;
    },
    updateItemImageUrl(state, args) {
        const item = state.library.getItemById(args.item.id);
        item.imageUrl = args.imageUrl;
        state.library.optionalFields.images = true;
    },
    updateItemUnit(state, unit) {
        const previousItemUnit = state.library.itemUnit;
        state.library.itemUnit = unit;
        if (state.library.totalUnit === previousItemUnit) state.library.totalUnit = unit;
    },
    removeItemImage(state, updateItem) {
        const item = state.library.getItemById(updateItem.id);
        item.image = '';
        item.imageUrl = '';
    },
    updateCategoryItem(state, args) {
        args.category.updateCategoryItem(args.categoryItem);
        recalculateListForCategory(state.library, args.category);
    },
    toggleOptionalItem(state, args) {
        args.category.toggleOptionalItem(args.itemId);
        recalculateListForCategory(state.library, args.category);
    },
    removeItemFromCategory(state, args) {
        args.category.removeItem(args.itemId);
        state.library.purgeBlankItems([args.itemId]);
        recalculateListForCategory(state.library, args.category);
    },
    // Undo of removeItemFromCategory: puts the same row (quantity, worn, rating) back where it was.
    restoreItemInCategory(state, args) {
        const { category, categoryItem, index } = args;
        if (!category.getCategoryItemById(categoryItem.itemId)) {
            const at = Math.min(index, category.categoryItems.length);
            category.categoryItems.splice(at, 0, { ...categoryItem });
        }
        recalculateListForCategory(state.library, category);
    },
    copyList(state, listId) {
        const copiedList = state.library.copyList(listId);
        if (!copiedList) return;
        state.library.defaultListId = copiedList.id;
    },
};
