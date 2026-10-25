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

    const created = library.newList();
    assert('a new list shares its item links by default', created.publicFields.links === true);
    assert('a new list keeps price, images and CSV off', created.publicFields.price === false
        && created.publicFields.images === false
        && created.publicFields.downloadable === false);

    // The default belongs to creation only: a saved list without the field is not rewritten.
    const reloaded = new Library();
    reloaded.load({
        version: '0.3',
        totalUnit: 'g',
        itemUnit: 'g',
        defaultListId: 7,
        sequence: 50,
        showSidebar: true,
        optionalFields: reloaded.optionalFields,
        currencySymbol: '€',
        items: [],
        categories: [],
        lists: [{ id: 7, name: 'Old list', categoryIds: [] }],
    });
    assert('a list loaded without publicFields stays as saved', reloaded.getListById(7).publicFields === undefined);

    // A saved choice survives a reload.
    const saved = JSON.parse(JSON.stringify(created.save()));
    const withChoice = new Library();
    withChoice.load({
        version: '0.3',
        totalUnit: 'g',
        itemUnit: 'g',
        defaultListId: 9,
        sequence: 50,
        showSidebar: true,
        optionalFields: withChoice.optionalFields,
        currencySymbol: '€',
        items: [],
        categories: [],
        lists: [{
            id: 9, name: 'Mine', categoryIds: [], publicFields: { price: true, links: false, images: false, downloadable: false },
        }],
    });
    assert('a saved links choice of "off" is kept', withChoice.getListById(9).publicFields.links === false);
    assert('save keeps publicFields', saved.publicFields.links === true);

    // Template data is raw library data: the first list gets the same default, a saved choice stays.
    const { applyQuickSetup } = require('../client/utils/quick-setup.js');
    const fromTemplate = applyQuickSetup({ defaultListId: 1, lists: [{ id: 1, name: 'T', categoryIds: [] }] }, {});
    assert('a template list shares its item links by default', fromTemplate.lists[0].publicFields.links === true
        && fromTemplate.lists[0].publicFields.price === false);
    const kept = applyQuickSetup({
        defaultListId: 1,
        lists: [{
            id: 1, name: 'T', categoryIds: [], publicFields: { price: true, links: false, images: false, downloadable: false },
        }],
    }, {});
    assert('applyQuickSetup keeps an existing publicFields choice', kept.lists[0].publicFields.links === false && kept.lists[0].publicFields.price === true);

    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed ? 1 : 0);
}

run();
