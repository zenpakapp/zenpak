/**
 * Unit test: Category.prototype.toggleOptionalItem
 * Run with: node test/unit-category-optional-item.js
 */

const { Library } = require('../client/dataTypes.js');

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

function setupCategoryWithItem(initialQty) {
    const library = new Library();
    const category = library.getCategoryById(library.getListById(library.defaultListId).categoryIds[0]);
    const item = library.newItem({ category });
    library.updateItem({ ...item, weight: 500 });
    category.updateCategoryItem({ itemId: item.id, qty: initialQty });
    return { category, item: library.getItemById(item.id) };
}

console.log('\n--- toggleOptionalItem: toggle on stores prior qty and zeroes ---');

{
    const { category, item } = setupCategoryWithItem(3);
    category.toggleOptionalItem(item.id);
    const categoryItem = category.getCategoryItemById(item.id);

    assert('qty is zeroed', categoryItem.qty === 0);
    assert('prior qty is stored', categoryItem.qtyBeforeOptional === 3);
}

console.log('\n--- toggleOptionalItem: toggle off restores exact prior qty ---');

{
    const { category, item } = setupCategoryWithItem(3);
    category.toggleOptionalItem(item.id);
    category.toggleOptionalItem(item.id);
    const categoryItem = category.getCategoryItemById(item.id);

    assert('qty restored to prior value', categoryItem.qty === 3);
    assert('stored prior qty is cleared', typeof categoryItem.qtyBeforeOptional === 'undefined');
}

console.log('\n--- toggleOptionalItem: toggle off with no stored value falls back to 1 ---');

{
    const { category, item } = setupCategoryWithItem(0);
    category.toggleOptionalItem(item.id);
    const categoryItem = category.getCategoryItemById(item.id);

    assert('qty falls back to 1', categoryItem.qty === 1);
}

console.log('\n--- toggleOptionalItem: on -> off -> on re-stores the latest prior qty ---');

{
    const { category, item } = setupCategoryWithItem(2);
    category.toggleOptionalItem(item.id);
    category.toggleOptionalItem(item.id);
    category.updateCategoryItem({ itemId: item.id, qty: 5 });
    category.toggleOptionalItem(item.id);
    const categoryItem = category.getCategoryItemById(item.id);

    assert('latest qty is stored, not the original', categoryItem.qtyBeforeOptional === 5);
}

console.log('\n--- toggleOptionalItem: weight excluded from subtotal while optional ---');

{
    const { category, item } = setupCategoryWithItem(2);
    category.toggleOptionalItem(item.id);
    category.calculateSubtotal();

    assert('subtotal weight excludes optional item', category.subtotalWeight === 0);
}

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
