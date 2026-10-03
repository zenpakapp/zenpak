/**
 * Unit test: quick-add mutations (addItemToCategory, createCategoryAndAddItem)
 * place items as optional (qty 0, no qtyBeforeOptional) when requested.
 * Run with: node test/unit-quick-add-optional.js
 */

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

function countCalculateTotals(list) {
    const original = list.calculateTotals.bind(list);
    let count = 0;
    list.calculateTotals = () => {
        count++;
        return original();
    };
    return () => count;
}

console.log('\n--- addItemToCategory: optional flag ---');

{
    const library = new Library();
    const state = { library, categoryItemVersion: 0 };
    const item = library.newItem({});
    const category = library.getCategoryById(library.getListById(library.defaultListId).categoryIds[0]);

    mutations.addItemToCategory(state, { itemId: item.id, categoryId: category.id, dropIndex: 0, optional: true });
    const categoryItem = category.getCategoryItemById(item.id);

    assert('placed with qty 0', categoryItem.qty === 0);
    assert('no qtyBeforeOptional set', typeof categoryItem.qtyBeforeOptional === 'undefined');
}

console.log('\n--- addItemToCategory: no optional flag keeps default qty ---');

{
    const library = new Library();
    const state = { library, categoryItemVersion: 0 };
    const item = library.newItem({});
    const category = library.getCategoryById(library.getListById(library.defaultListId).categoryIds[0]);

    mutations.addItemToCategory(state, { itemId: item.id, categoryId: category.id, dropIndex: 0 });
    const categoryItem = category.getCategoryItemById(item.id);

    assert('placed with default qty 1', categoryItem.qty === 1);
}

console.log('\n--- addItemToCategory: recalculates target list only ---');

{
    const library = new Library();
    const state = { library, categoryItemVersion: 0 };
    const item = library.newItem({});
    const activeList = library.getListById(library.defaultListId);
    const targetList = library.newList();
    const targetCategory = library.newCategory({ list: targetList });
    const getActiveRecalculateCount = countCalculateTotals(activeList);
    const getTargetRecalculateCount = countCalculateTotals(targetList);

    mutations.addItemToCategory(state, { itemId: item.id, categoryId: targetCategory.id, dropIndex: 0 });

    assert('target list recalculated', getTargetRecalculateCount() === 1);
    assert('active list not recalculated for another list', getActiveRecalculateCount() === 0);
}

console.log('\n--- newItem: library-only item skips list recalculation ---');

{
    const library = new Library();
    const state = { library, categoryItemVersion: 0 };
    const activeList = library.getListById(library.defaultListId);
    const getActiveRecalculateCount = countCalculateTotals(activeList);

    mutations.newItem(state, { _isNew: true, name: 'Loose item' });

    assert('library-only item does not recalculate active list', getActiveRecalculateCount() === 0);
}

console.log('\n--- createCategoryAndAddItem: optional flag ---');

{
    const library = new Library();
    const state = { library };
    const item = library.newItem({});
    const list = library.getListById(library.defaultListId);

    mutations.createCategoryAndAddItem(state, { itemId: item.id, name: 'New Category', listId: list.id, optional: true });
    const category = list.categoryIds
        .map(id => library.getCategoryById(id))
        .find(c => c.name === 'New Category');
    const categoryItem = category.getCategoryItemById(item.id);

    assert('placed with qty 0', categoryItem.qty === 0);
    assert('no qtyBeforeOptional set', typeof categoryItem.qtyBeforeOptional === 'undefined');
}

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
