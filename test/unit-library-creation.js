/**
 * Unit test: creating an Item or a List hands back the object that was created. The caller never looks
 * for it by position ("the last one in the array"): the proof is an insertion order that puts it first.
 * Run with: node test/unit-library-creation.js
 */

'use strict';

const { Library } = require('../client/dataTypes.js');
const mutations = require('../client/store/mutations-library.js');
const { createItem, createNamedList, duplicateItem } = require('../client/services/library-creation.js');

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

// A store as far as the helpers see it: state, and commit running the real mutations.
function fakeStore(library) {
    const store = {
        state: { library },
        committed: [],
        commit(type, payload) {
            store.committed.push(type);
            mutations[type](store.state, payload);
        },
    };
    return store;
}

// An insertion order that is not "at the end": the new Item or List goes to the front.
function insertAtFront(library) {
    const { newItem, newList } = library;
    library.newItem = function (args) {
        const item = newItem.call(this, args);
        this.items.unshift(this.items.pop());
        return item;
    };
    library.newList = function () {
        const list = newList.call(this);
        this.lists.unshift(this.lists.pop());
        return list;
    };
}

console.log('\n--- createItem ---');
{
    const library = new Library();
    const store = fakeStore(library);
    const category = library.getCategoryById(library.getListById(library.defaultListId).categoryIds[0]);
    const item = createItem(store, { category, name: 'Tent' });

    assert('it returns an Item of the library', library.getItemById(item.id) === item);
    assert('the Item carries the name', item.name === 'Tent');
    assert('the Item is placed in the Category', Boolean(category.getCategoryItemById(item.id)));
    assert('it went through the newItem mutation (autosave listens to mutations)', store.committed.join() === 'newItem');
}

console.log('\n--- createItem: the position of the new Item does not matter ---');
{
    const library = new Library();
    library.newItem({});
    library.newItem({});
    insertAtFront(library);
    const store = fakeStore(library);
    const before = library.items.length;
    const item = createItem(store, { name: 'Stove' });

    assert('the Item was inserted first, not last', library.items[0] === item && library.items[before] !== item);
    assert('and it is the one returned', item.name === 'Stove');
}

console.log('\n--- createItem: a library-only Item ---');
{
    const library = new Library();
    const store = fakeStore(library);
    const item = createItem(store, { name: 'Loose' });
    assert('without a Category the Item is in the library only', library.getItemById(item.id) === item
        && library.lists.every((list) => list.categoryIds.every((id) => !library.getCategoryById(id).getCategoryItemById(item.id))));
}

console.log('\n--- createNamedList ---');
{
    const library = new Library();
    const store = fakeStore(library);
    const lists = library.lists.length;
    const list = createNamedList(store, 'Weekend');

    assert('it returns a new List of the library', library.getListById(list.id) === list && library.lists.length === lists + 1);
    assert('the List carries the name', list.name === 'Weekend');
    assert('it has one Category to put items in', list.categoryIds.length === 1);
    assert('it does not become the open list', library.defaultListId !== list.id);
}

console.log('\n--- createNamedList: the position of the new List does not matter ---');
{
    const library = new Library();
    insertAtFront(library);
    const store = fakeStore(library);
    const list = createNamedList(store, 'Trek');

    assert('the List was inserted first, not last', library.lists[0] === list);
    assert('and it is the one returned', list.name === 'Trek');
}

console.log('\n--- createNamedList: a blank name gets the default ---');
{
    const library = new Library();
    const list = createNamedList(fakeStore(library), '');
    assert('the default name', list.name === 'New list');
}

console.log('\n--- duplicateItem ---');
{
    const library = new Library();
    insertAtFront(library);
    const store = fakeStore(library);
    const original = createItem(store, { name: 'Pack' });
    library.updateItem({ ...original, weight: 900, brand: 'Acme', tags: ['winter'] });
    const copy = duplicateItem(store, library.getItemById(original.id));

    assert('the copy is a new Item', copy.id !== original.id && library.getItemById(copy.id) === copy);
    assert('it has the fields of the original', copy.name === 'Pack' && copy.weight === 900 && copy.brand === 'Acme');
    assert('its tags are its own', copy.tags !== original.tags && copy.tags.join() === 'winter');
    assert('the original is untouched', library.getItemById(original.id).name === 'Pack');
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
