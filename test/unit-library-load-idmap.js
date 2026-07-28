'use strict';

const { Library } = require('../client/models/library.js');

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

function run() {
    const library = new Library();
    const seedListId = library.lists[0].id;
    const seedCategoryId = library.categories[0].id;

    library.load({
        version: '0.3',
        totalUnit: 'g',
        itemUnit: 'g',
        defaultListId: 42,
        sequence: 200,
        showSidebar: true,
        optionalFields: library.optionalFields,
        currencySymbol: '€',
        items: [{
            id: 101,
            name: 'Powerbank',
            description: 'Decathlon 10000mAh',
            weight: 172000,
            authorUnit: 'g',
            price: 0,
            image: '',
            imageUrl: '',
            url: '',
            brand: '',
            category: 'Electronique',
            tags: [],
        }],
        categories: [{
            id: 102,
            name: 'Electronique',
            categoryItems: [{ itemId: 101, qty: 1, worn: 0, consumable: false, star: 0 }],
        }],
        lists: [{
            id: 42,
            name: 'GR34',
            categoryIds: [102],
        }],
    });

    assert('load clears the first-run list from idMap', !library.getListById(seedListId));
    assert('load clears the first-run category from idMap', !library.getCategoryById(seedCategoryId));
    assert('load maps item id to loaded item details', library.getItemById(101).description === 'Decathlon 10000mAh');
    assert('load maps default list to loaded list', library.getListById(42).name === 'GR34');

    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}

run();
