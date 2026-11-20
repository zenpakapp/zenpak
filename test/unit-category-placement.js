/**
 * Unit test: a Category holds at most one Placement per Item. Category.addItem enforces it: adding an
 * Item that is already placed returns the existing Placement and changes nothing. No caller checks first.
 * Run with: node test/unit-category-placement.js
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

function setup() {
    const library = new Library();
    const category = library.getCategoryById(library.getListById(library.defaultListId).categoryIds[0]);
    const item = library.newItem({ category: library.newCategory({ list: library.getListById(library.defaultListId) }) });
    return { library, category, item };
}

console.log('\n--- addItem: a new Item gets a Placement ---');
{
    const { category, item } = setup();
    const placement = category.addItem({ itemId: item.id, qty: 2 });

    assert('one Placement in the Category', category.categoryItems.length === 1);
    assert('the Placement is returned', placement === category.categoryItems[0]);
    assert('it carries the Item and its quantity', placement.itemId === item.id && placement.qty === 2);
    assert('defaults apply (worn 0, consumable false, star 0)', placement.worn === 0 && placement.consumable === false && placement.star === 0);
}

console.log('\n--- addItem: an Item already placed is not placed twice ---');
{
    const { category, item } = setup();
    const first = category.addItem({ itemId: item.id, qty: 2 });
    first.worn = 1;
    const again = category.addItem({ itemId: item.id, qty: 5 });

    assert('still one Placement', category.categoryItems.length === 1);
    assert('the existing Placement is returned', again === first);
    assert('its quantity is untouched', again.qty === 2);
    assert('its flags are untouched', again.worn === 1);
}

console.log('\n--- addItem: the order of the others is kept ---');
{
    const { library, category, item } = setup();
    const other = library.newItem({ category });
    const third = library.newItem({ category });
    category.categoryItems = [];
    category.addItem({ itemId: item.id });
    category.addItem({ itemId: other.id });
    category.addItem({ itemId: third.id });
    category.addItem({ itemId: item.id });

    assert('three Placements, in the order they were added',
        category.categoryItems.map((c) => c.itemId).join() === [item.id, other.id, third.id].join());
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
