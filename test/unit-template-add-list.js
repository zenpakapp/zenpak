/**
 * Unit test: adding a template as a new list to an existing library
 * (the "Add list from a template" action after signup).
 * Run with: node test/unit-template-add-list.js
 */

'use strict';

const { Library } = require('../client/models/library.js');
const mutations = require('../client/store/mutations-import.js');
const { templates, templateToListImport, templateWeightMg } = require('../client/composables/useTemplatePicker.js');

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

function newState() {
    const library = new Library();
    const firstList = library.lists[0];
    firstList.name = 'My own list';
    return { library, globalAlerts: [] };
}

console.log('\n--- adding a template keeps the existing lists ---');
{
    const state = newState();
    const template = templates.find((t) => t.id === 'trail-running');
    const before = state.library.lists.length;
    mutations.importPublicList(state, templateToListImport(template, 'Trail running'));
    assert('one list added', state.library.lists.length === before + 1);
    assert('existing list is untouched', state.library.lists[0].name === 'My own list');
    const added = state.library.lists[state.library.lists.length - 1];
    assert('new list is the current one', state.library.defaultListId === added.id);
    assert('name is not prefixed with "Copy of"', added.name === 'Trail running');
    assert('carries the template activity tag', added.listTypes.join() === 'trail-running');
    assert('carries the template duration tag', added.durations.join() === 'day');
    assert('carries the template seasons', added.seasons.join() === template.seasons.join());
    added.calculateTotals();
    assert('total weight equals the template weight', added.totalWeight === templateWeightMg(template.data));
    const itemCount = template.data.items.length;
    assert('one library item per template item', state.library.items.length >= itemCount);
}

console.log('\n--- a custom list name wins ---');
{
    const state = newState();
    const template = templates.find((t) => t.id === 'via-ferrata');
    mutations.importPublicList(state, templateToListImport(template, 'Dolomites 2027'));
    const added = state.library.lists[state.library.lists.length - 1];
    assert('custom name used', added.name === 'Dolomites 2027');
}

console.log('\n--- an empty name falls back to the template name ---');
{
    const state = newState();
    const template = templates.find((t) => t.id === 'light-travel');
    const payload = templateToListImport(template, '', 'Light travel');
    assert('fallback name', payload.listName === 'Light travel');
}

console.log('\n--- structure-only template ---');
{
    const state = newState();
    const template = templates.find((t) => t.id === 'categories-only');
    assert('template exists', Boolean(template));
    if (template) {
        mutations.importPublicList(state, templateToListImport(template, 'Skeleton'));
        const added = state.library.lists[state.library.lists.length - 1];
        assert('nine categories', added.categoryIds.length === 9);
        const names = added.categoryIds.map((id) => state.library.getCategoryById(id).name);
        assert('taxonomy order', names.join('|') === [
            'Pack', 'Shelter', 'Sleep System', 'Clothing & Footwear', 'Water',
            'Cook & Food', 'Hygiene & Health', 'Safety & Navigation', 'Electronics & Essentials',
        ].join('|'));
        const itemCount = added.categoryIds.reduce((sum, id) => sum + state.library.getCategoryById(id).categoryItems.length, 0);
        assert('no items', itemCount === 0);
    }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
