'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(path.join(__dirname, '../client/store/mutations-library.js'), 'utf8');
const sandbox = {
    module: { exports: {} },
    exports: {},
    require(name) {
        if (name === '../utils/utils') return { arrayMove: (arr) => arr };
        return require(name);
    },
};
vm.runInNewContext(source, sandbox, { filename: 'mutations-library.js' });
const mutations = sandbox.module.exports;

let passed = 0; let failed = 0;
function assert(desc, cond) {
    if (cond) { console.log(`  PASS  ${desc}`); passed++; }
    else { console.error(`  FAIL  ${desc}`); failed++; }
}

const list = { id: 1, publicFields: { price: false, links: false, images: false } };
const state = {
    library: {
        getListById(id) {
            return id === list.id ? list : null;
        },
    },
};

mutations.updateListPublicFields(state, {
    listId: 1,
    downloadable: true,
});

assert('downloadable public field is saved', list.publicFields.downloadable === true);
assert('price remains unchanged', list.publicFields.price === false);
assert('links remain unchanged', list.publicFields.links === false);
assert('images remain unchanged', list.publicFields.images === false);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
