'use strict';

const { Library } = require('../client/models/library.js');
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

function run() {
    const state = { library: new Library() };
    const category = state.library.getCategoryById(state.library.getListById(state.library.defaultListId).categoryIds[0]);
    const item = state.library.newItem({ category });

    mutations.updateItemImageUrl(state, { imageUrl: 'https://res.cloudinary.com/demo/image/upload/lighterpack/abc123.jpg', item });
    assert('updateItemImageUrl sets imageUrl', item.imageUrl === 'https://res.cloudinary.com/demo/image/upload/lighterpack/abc123.jpg');
    assert('updateItemImageUrl does not touch legacy image field', item.image === '');

    mutations.removeItemImage(state, item);
    assert('removeItemImage clears imageUrl', item.imageUrl === '');

    const legacyItem = state.library.newItem({ category });
    legacyItem.image = 'legacyImgurKey';
    mutations.removeItemImage(state, legacyItem);
    assert('removeItemImage clears legacy image field', legacyItem.image === '');

    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}

run();
