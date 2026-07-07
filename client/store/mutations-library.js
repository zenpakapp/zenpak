const { arrayMove } = require('../utils/utils');

module.exports = {
    setDefaultList(state, list) {
        state.library.defaultListId = list.id;
        state.library.getListById(state.library.defaultListId).calculateTotals();
        state.listVersion += 1;
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
    newItem(state, { category, _isNew, name }) {
        const item = state.library.newItem({ category, _isNew });
        if (name) item.name = name;
        if (category && category.name && !item.category) item.category = category.name;
        state.library.getListById(state.library.defaultListId).calculateTotals();
    },
    newCategory(state, list) {
        const category = state.library.newCategory({ list, _isNew: true });
        state.library.newItem({ category });
        state.library.getListById(state.library.defaultListId).calculateTotals();
    },
    newList(state) {
        const list = state.library.newList();
        const category = state.library.newCategory({ list });
        state.library.newItem({ category });
        list.calculateTotals();
        state.library.defaultListId = list.id;
    },
    newListNamed(state, name) {
        const list = state.library.newList();
        list.name = name || 'New list';
        state.library.newCategory({ list });
        list.calculateTotals();
    },
    duplicateItem(state, item) {
        const copy = state.library.newItem({});
        const fields = ['name', 'description', 'weight', 'authorUnit', 'price', 'image', 'imageUrl', 'url', 'shop', 'affiliateUrl', 'promoCode', 'promoLabel', 'brand', 'category', 'tags', 'starred'];
        fields.forEach(f => {
            if (item[f] !== undefined) copy[f] = Array.isArray(item[f]) ? [...item[f]] : item[f];
        });
        state.library.updateItem(copy);
    },
    removeItem(state, item) {
        state.library.removeItem(item.id);
        state.library.getListById(state.library.defaultListId).calculateTotals();
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
    removeList(state, list) { state.library.removeList(list.id); },
    reorderList(state, args) {
        state.library.lists = arrayMove(state.library.lists, args.before, args.after);
    },
    reorderCategory(state, args) {
        const list = state.library.getListById(args.list.id);
        list.categoryIds = arrayMove(list.categoryIds, args.before, args.after);
        state.library.getListById(state.library.defaultListId).calculateTotals();
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
        state.library.getListById(state.library.defaultListId).calculateTotals();
    },
    addItemToCategory(state, args) {
        const item = state.library.getItemById(args.itemId);
        const dropCategory = state.library.getCategoryById(args.categoryId);
        if (item && dropCategory) {
            if (!dropCategory.getCategoryItemById(item.id)) dropCategory.addItem({ itemId: item.id });
            const categoryItem = dropCategory.getCategoryItemById(item.id);
            const categoryItemIndex = dropCategory.categoryItems.indexOf(categoryItem);
            if (categoryItem && categoryItemIndex !== -1) {
                dropCategory.categoryItems = arrayMove(dropCategory.categoryItems, categoryItemIndex, args.dropIndex);
            }
            state.library.getListById(state.library.defaultListId).calculateTotals();
            state.categoryItemVersion += 1;
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
        if (!category.getCategoryItemById(item.id)) category.addItem({ itemId: item.id });
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
    updateListPublicFields(state, args) {
        const list = state.library.getListById(args.listId);
        if (list) {
            if (!list.publicFields) list.publicFields = {};
            if (typeof args.price !== 'undefined') list.publicFields.price = args.price;
            if (typeof args.links !== 'undefined') list.publicFields.links = args.links;
            if (typeof args.images !== 'undefined') list.publicFields.images = args.images;
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
    updateCreatorSettings(state, creator) {
        state.library.creator = { ...state.library.creator, ...creator };
    },
    setExternalId(state, args) {
        const list = state.library.getListById(args.list.id);
        list.externalId = args.externalId;
    },
    updateCategoryName(state, updatedCategory) {
        const category = state.library.getCategoryById(updatedCategory.id);
        category.name = updatedCategory.name;
        state.library.getListById(state.library.defaultListId).calculateTotals();
    },
    updateCategoryColor(state, updatedCategory) {
        const category = state.library.getCategoryById(updatedCategory.id);
        category.color = updatedCategory.color;
    },
    updateItem(state, item) {
        state.library.updateItem(item);
        state.library.lists.forEach(list => list.calculateTotals());
        state.itemVersion += 1;
    },
    mergeItems(state, { keepId, removeId }) {
        for (const list of state.library.lists) {
            for (const categoryId of list.categoryIds) {
                const category = state.library.getCategoryById(categoryId);
                if (!category) continue;
                const removeCI = category.getCategoryItemById(removeId);
                if (!removeCI) continue;
                const keepCI = category.getCategoryItemById(keepId);
                if (keepCI) {
                    category.removeItem(removeId);
                } else {
                    removeCI.itemId = keepId;
                }
            }
        }
        const removeItem = state.library.getItemById(removeId);
        if (removeItem) {
            state.library.items.splice(state.library.items.indexOf(removeItem), 1);
            delete state.library.idMap[removeId];
        }
        state.library.getListById(state.library.defaultListId).calculateTotals();
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
    updateItemImage(state, args) {
        const item = state.library.getItemById(args.item.id);
        item.image = args.image;
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
    },
    updateCategoryItem(state, args) {
        args.category.updateCategoryItem(args.categoryItem);
        state.library.getListById(state.library.defaultListId).calculateTotals();
        state.categoryItemVersion += 1;
    },
    removeItemFromCategory(state, args) {
        args.category.removeItem(args.itemId);
        state.library.getListById(state.library.defaultListId).calculateTotals();
        state.categoryItemVersion += 1;
    },
    copyList(state, listId) {
        const copiedList = state.library.copyList(listId);
        if (!copiedList) return;
        state.library.defaultListId = copiedList.id;
        state.listVersion += 1;
    },
};
