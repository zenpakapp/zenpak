'use strict';

const { Library } = require('../client/models/library.js');

const utilsPath = require.resolve('../client/utils/utils.js');
require.cache[utilsPath] = {
    exports: { arrayMove: items => items },
    id: utilsPath,
    filename: utilsPath,
    loaded: true,
    children: [],
    paths: [],
};

const mutations = require('../client/store/mutations-library.js');

let passed = 0;
let failed = 0;

function assert(description, condition) {
    if (condition) {
        console.log(`  PASS  ${description}`);
        passed++;
    } else {
        console.error(`  FAIL  ${description}`);
        failed++;
    }
}

function itemIds(category) {
    return category.categoryItems.map(categoryItem => categoryItem.itemId);
}

function run() {
    const library = new Library();
    library.itemUnit = 'g';
    const state = { library, itemVersion: 0 };

    const keep = library.newItem({});
    keep.name = 'Merged headlamp';
    keep.weight = 42000;

    const remove = library.newItem({});
    remove.name = 'Old headlamp';
    remove.weight = 33000;

    const firstList = library.lists[0];
    firstList.name = 'Default list';
    const firstCategory = library.getCategoryById(firstList.categoryIds[0]);
    firstCategory.name = 'Electronics';
    firstCategory.addItem({ itemId: remove.id, qty: 1 });

    const secondList = library.newList();
    secondList.name = 'Other list';
    const secondCategory = library.newCategory({ list: secondList });
    secondCategory.name = 'Electronics';
    secondCategory.addItem({ itemId: remove.id, qty: 2, worn: true, star: 2 });
    library.defaultListId = firstList.id;

    mutations.mergeItems(state, { keepId: keep.id, removeId: remove.id });

    assert('merge replaces the removed item in the default list', itemIds(firstCategory).includes(keep.id));
    assert('merge replaces the removed item in non-default lists', itemIds(secondCategory).includes(keep.id));
    assert('merge preserves category item metadata while replacing ids', secondCategory.getCategoryItemById(keep.id).qty === 2 && secondCategory.getCategoryItemById(keep.id).star === 2);
    assert('merge removes the old item from the library', !library.getItemById(remove.id));
    assert('merge recalculates non-default list totals', secondList.totalWeight === keep.weight * 2);

    const duplicateLibrary = new Library();
    const duplicateState = { library: duplicateLibrary, itemVersion: 0 };
    const duplicateKeep = duplicateLibrary.newItem({});
    duplicateKeep.name = 'Keep jacket';
    duplicateKeep.weight = 1000;
    const duplicateRemove = duplicateLibrary.newItem({});
    duplicateRemove.name = 'Remove jacket';
    duplicateRemove.weight = 1000;
    const duplicateList = duplicateLibrary.lists[0];
    const duplicateCategory = duplicateLibrary.getCategoryById(duplicateList.categoryIds[0]);
    duplicateCategory.addItem({ itemId: duplicateKeep.id, qty: 1, worn: false, star: 1 });
    duplicateCategory.addItem({ itemId: duplicateRemove.id, qty: 2, worn: true, consumable: true, star: 3 });

    mutations.mergeItems(duplicateState, { keepId: duplicateKeep.id, removeId: duplicateRemove.id });

    const mergedCategoryItem = duplicateCategory.getCategoryItemById(duplicateKeep.id);
    assert('merge keeps one row when both items were in the same category', duplicateCategory.categoryItems.length === 1);
    assert('merge combines quantities when both items were in the same category', mergedCategoryItem.qty === 3);
    assert('merge preserves strongest row metadata when collapsing duplicate rows', mergedCategoryItem.worn === true && mergedCategoryItem.consumable === true && mergedCategoryItem.star === 3);

    const crossCategoryLibrary = new Library();
    const crossCategoryState = { library: crossCategoryLibrary, itemVersion: 0 };
    const crossKeep = crossCategoryLibrary.newItem({});
    crossKeep.name = 'Merged fleece';
    const crossRemove = crossCategoryLibrary.newItem({});
    crossRemove.name = 'Old fleece';
    const crossList = crossCategoryLibrary.lists[0];
    const wornCategory = crossCategoryLibrary.getCategoryById(crossList.categoryIds[0]);
    wornCategory.name = 'Worn';
    const packedCategory = crossCategoryLibrary.newCategory({ list: crossList });
    packedCategory.name = 'Packed';
    wornCategory.addItem({ itemId: crossKeep.id, qty: 1 });
    packedCategory.addItem({ itemId: crossRemove.id, qty: 1 });

    mutations.mergeItems(crossCategoryState, { keepId: crossKeep.id, removeId: crossRemove.id });

    assert('merge keeps the item in its existing different category', itemIds(wornCategory).includes(crossKeep.id));
    assert('merge replaces removed item rows in other categories', itemIds(packedCategory).includes(crossKeep.id));
    assert('merge removes the old item when keep item was in a different category', !crossCategoryLibrary.getItemById(crossRemove.id));

    const unlistedKeepLibrary = new Library();
    const unlistedKeepState = { library: unlistedKeepLibrary, itemVersion: 0 };
    const unlistedKeep = unlistedKeepLibrary.newItem({});
    unlistedKeep.name = 'Library-only tent';
    const unlistedRemove = unlistedKeepLibrary.newItem({});
    unlistedRemove.name = 'Listed tent';
    const unlistedList = unlistedKeepLibrary.lists[0];
    const unlistedCategory = unlistedKeepLibrary.getCategoryById(unlistedList.categoryIds[0]);
    unlistedCategory.addItem({ itemId: unlistedRemove.id, qty: 1 });

    mutations.mergeItems(unlistedKeepState, { keepId: unlistedKeep.id, removeId: unlistedRemove.id });

    assert('merge can use a library-only keep item in existing list rows', itemIds(unlistedCategory).includes(unlistedKeep.id));
    assert('merge removes the old item when keep item was library-only', !unlistedKeepLibrary.getItemById(unlistedRemove.id));

    const removeLibrary = new Library();
    const removeState = { library: removeLibrary, itemVersion: 0, categoryItemVersion: 0 };
    const removeItem = removeLibrary.newItem({});
    removeItem.name = 'Shared stove';
    removeItem.weight = 100;
    const removeList = removeLibrary.lists[0];
    const removeFirstCategory = removeLibrary.getCategoryById(removeList.categoryIds[0]);
    removeFirstCategory.name = 'Cooking';
    const removeSecondCategory = removeLibrary.newCategory({ list: removeList });
    removeSecondCategory.name = 'Electronics';
    removeFirstCategory.addItem({ itemId: removeItem.id, qty: 1 });
    removeSecondCategory.addItem({ itemId: removeItem.id, qty: 1 });

    mutations.removeItem(removeState, removeItem);

    assert('removeItem deletes every row for the item in the same list', !itemIds(removeFirstCategory).includes(removeItem.id) && !itemIds(removeSecondCategory).includes(removeItem.id));
    assert('removeItem removes the item from the library', !removeLibrary.getItemById(removeItem.id));
    assert('removeItem bumps category item version after removing rows', removeState.categoryItemVersion === 1);

    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}

run();
