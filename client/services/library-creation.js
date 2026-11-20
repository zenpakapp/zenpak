// Creating things in the Library, and getting back what was created.
//
// A creation goes through a store mutation (the autosave listens to mutations), and a mutation returns
// nothing: it leaves the object it made on its payload as `created`. These functions commit the mutation
// and hand that object back, so a caller never looks for the new Item or List by its position in an array.
// `store` is anything with `commit`; the object returned is the one the store holds (the reactive one).

// A new Item. With a `category` it is placed there; without, it lives in the library only.
function createItem(store, { category, name } = {}) {
    const payload = { category, _isNew: true, name };
    store.commit('newItem', payload);
    return payload.created;
}

// A new List with one Category. It does not become the open list.
function createNamedList(store, name) {
    const payload = { name };
    store.commit('newListNamed', payload);
    return payload.created;
}

// A copy of an Item: a new Item with the same fields.
function duplicateItem(store, item) {
    const payload = { item };
    store.commit('duplicateItem', payload);
    return payload.created;
}

module.exports = { createItem, createNamedList, duplicateItem };
