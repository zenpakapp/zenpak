const assignIn = require('lodash/assignIn');

const { PLAN_FREE, getPlanFeatures } = require('../services/entitlements.js');
const { VISIBILITY_PRIVATE, normalizeVisibility } = require('../services/public-visibility.js');
const { Item } = require('./item.js');
const { Category } = require('./category.js');
const { List } = require('./list.js');

const defaultOptionalFields = {
    images: false,
    price: false,
    worn: true,
    consumable: true,
    listDescription: false,
};

const Library = function () {
    this.version = '0.3';
    this.idMap = {};
    this.items = [];
    this.categories = [];
    this.lists = [];
    this.sequence = 0;
    this.defaultListId = 1;
    this.totalUnit = 'oz';
    this.itemUnit = 'oz';
    this.showSidebar = true;
    this.showImages = false;
    this.optionalFields = assignIn({}, defaultOptionalFields);
    this.currencySymbol = '$';
    this.publicProfile = {
        displayName: '',
        trailName: '',
        bio: '',
        location: '',
        avatarUrl: '',
        links: [],
        gearPhilosophy: [],
        featuredListIds: [],
        visibility: VISIBILITY_PRIVATE,
        allowSearchIndexing: false,
    };
    this.entitlements = {
        plan: PLAN_FREE,
        source: 'self-hosted',
        features: getPlanFeatures(PLAN_FREE),
    };
    this.creator = {
        affiliateRules: [],
        disclosure: '',
    };
    this.insights = {
        profileViews: 0,
        listViews: {},
        listCopies: {},
        gearClicks: {},
        promoClicks: {},
    };
    this.firstRun();
    return this;
};


Library.prototype.firstRun = function () {
    const firstList = this.newList();
    const firstCategory = this.newCategory({ list: firstList });
    const firstItem = this.newItem({ category: firstCategory });
};

Library.prototype.newItem = function ({ category, _isNew }) {
    const temp = new Item({ id: this.nextSequence(), unit: this.itemUnit });
    this.items.push(temp);
    this.idMap[temp.id] = temp;
    if (category) {
        category.addItem({ itemId: temp.id, _isNew });
    }
    return temp;
};

Library.prototype.updateItem = function (item) {
    const oldItem = this.getItemById(item.id);
    const newItem = assignIn({}, oldItem, item);
    const idx = this.items.indexOf(oldItem);
    if (idx !== -1) this.items.splice(idx, 1, newItem);
    this.idMap[newItem.id] = newItem;
    return newItem;
};

Library.prototype.removeItem = function (id) {
    const item = this.getItemById(id);
    for (const i in this.lists) {
        const category = this.findCategoryWithItemById(id, this.lists[i].id);
        if (category) {
            category.removeItem(id);
        }
    }

    this.items.splice(this.items.indexOf(item), 1);
    delete this.idMap[id];

    return true;
};

Library.prototype.newCategory = function ({ list, _isNew }) {
    const temp = new Category({ id: this.nextSequence(), _isNew, library: this });

    this.categories.push(temp);
    this.idMap[temp.id] = temp;
    if (list) {
        list.addCategory(temp.id);
    }

    return temp;
};

Library.prototype.removeCategory = function (id, force) {
    const category = this.getCategoryById(id);
    const list = this.findListWithCategoryById(id);

    if (list && list.categoryIds.length == 1 && !force) {
        return false;
    }

    if (list) {
        list.removeCategory(id);
    }

    this.categories.splice(this.categories.indexOf(category), 1);
    delete this.idMap[id];

    return true;
};

Library.prototype.newList = function () {
    const temp = new List({ id: this.nextSequence(), library: this });
    this.lists.push(temp);
    this.idMap[temp.id] = temp;
    if (!this.defaultListId) this.defaultListId = temp.id;
    return temp;
};

Library.prototype.removeList = function (id) {
    if (this.lists.length === 1) return;
    const list = this.getListById(id);

    for (var i = 0; i < list.categoryIds.length; i++) {
        this.removeCategory(list.categoryIds[i], true);
    }

    this.lists.splice(this.lists.indexOf(list), 1);
    delete this.idMap[id];

    if (this.defaultListId == id) {
        let newId = -1;
        for (var i in this.lists) {
            newId = this.lists[i].id;
            break;
        }
        this.defaultListId = newId;
    }
};

Library.prototype.copyList = function (id) {
    const oldList = this.getListById(id);
    if (!oldList) return;

    const copiedList = this.newList();

    copiedList.name = `Copy of ${oldList.name}`;
    for (const i in oldList.categoryIds) {
        const oldCategory = this.getCategoryById(oldList.categoryIds[i]);
        const copiedCategory = this.newCategory({ list: copiedList });

        copiedCategory.name = oldCategory.name;

        for (const j in oldCategory.categoryItems) {
            copiedCategory.addItem(oldCategory.categoryItems[j]);
        }
    }

    return copiedList;
};

Library.prototype.renderChart = function (type) {
    const list = this.getListById(this.defaultListId);
    if (!list) return false;
    return list.renderChart(type);
};

Library.prototype.getCategoryById = function (id) {
    return this.idMap[id];
};

Library.prototype.getItemById = function (id) {
    return this.idMap[id];
};

Library.prototype.getListById = function (id) {
    return this.idMap[id];
};

Library.prototype.getItemsInCurrentList = function () {
    const out = [];
    const list = this.getListById(this.defaultListId);
    for (let i = 0; i < list.categoryIds.length; i++) {
        const category = this.getCategoryById(list.categoryIds[i]);
        if (category) {
            for (const j in category.categoryItems) {
                const categoryItem = category.categoryItems[j];
                out.push(categoryItem.itemId);
            }
        }
    }
    return out;
};

Library.prototype.findCategoryWithItemById = function (itemId, listId) {
    if (listId) {
        const list = this.getListById(listId);
        for (i in list.categoryIds) {
            var category = this.getCategoryById(list.categoryIds[i]);
            if (category) {
                for (var j in category.categoryItems) {
                    var categoryItem = category.categoryItems[j];
                    if (categoryItem.itemId == itemId) return category;
                }
            }
        }
    } else {
        for (var i in this.categories) {
            var category = this.categories[i];
            if (category) {
                for (var j in category.categoryItems) {
                    var categoryItem = category.categoryItems[j];
                    if (categoryItem.itemId == itemId) return category;
                }
            }
        }
    }
};

Library.prototype.findListWithCategoryById = function (id) {
    for (const i in this.lists) {
        const list = this.lists[i];
        for (const j in list.categoryIds) {
            if (list.categoryIds[j] == id) return list;
        }
    }
};

Library.prototype.nextSequence = function () {
    return ++this.sequence;
};

Library.prototype.save = function () {
    const out = {};

    out.version = this.version;
    out.totalUnit = this.totalUnit;
    out.itemUnit = this.itemUnit;
    out.defaultListId = this.defaultListId;
    out.sequence = this.sequence;
    out.showSidebar = this.showSidebar;
    out.optionalFields = this.optionalFields;
    out.currencySymbol = this.currencySymbol;
    out.publicProfile = this.publicProfile;
    out.entitlements = this.entitlements;
    out.creator = this.creator;
    out.insights = this.insights;

    out.items = [];
    for (var i in this.items) {
        out.items.push(this.items[i].save());
    }

    out.categories = [];
    for (var i in this.categories) {
        out.categories.push(this.categories[i].save());
    }

    out.lists = [];
    for (var i in this.lists) {
        out.lists.push(this.lists[i].save());
    }

    return out;
};

Library.prototype.load = function (serializedLibrary) {
    // upgrades should update "serializedLibrary" in-place instead of modifying "this"
    if (serializedLibrary.version === '0.1' || !serializedLibrary.version) {
        this.upgrade01to02(serializedLibrary);
    }
    if (serializedLibrary.version === '0.2') {
        this.upgrade02to03(serializedLibrary);
    }

    this.items = [];

    assignIn(this.optionalFields, serializedLibrary.optionalFields);
    if (serializedLibrary.publicProfile) {
        assignIn(this.publicProfile, serializedLibrary.publicProfile);
        this.publicProfile.visibility = normalizeVisibility(this.publicProfile.visibility);
    }
    if (serializedLibrary.entitlements) {
        assignIn(this.entitlements, serializedLibrary.entitlements);
    }
    if (serializedLibrary.creator) {
        assignIn(this.creator, serializedLibrary.creator);
        if (!Array.isArray(this.creator.affiliateRules)) this.creator.affiliateRules = [];
    }
    if (serializedLibrary.insights) {
        assignIn(this.insights, serializedLibrary.insights);
    }

    for (var i in serializedLibrary.items) {
        var temp = new Item({ id: serializedLibrary.items[i].id });
        temp.load(serializedLibrary.items[i]);
        this.items.push(temp);
        this.idMap[temp.id] = temp;
    }

    this.categories = [];
    for (var i in serializedLibrary.categories) {
        var temp = new Category({ id: serializedLibrary.categories[i].id, library: this });
        temp.load(serializedLibrary.categories[i]);
        this.categories.push(temp);
        this.idMap[temp.id] = temp;
    }

    this.lists = [];
    for (var i in serializedLibrary.lists) {
        var temp = new List({ id: serializedLibrary.lists[i].id, library: this });
        temp.load(serializedLibrary.lists[i]);
        this.lists.push(temp);
        this.idMap[temp.id] = temp;
    }

    if (serializedLibrary.showSidebar) this.showSidebar = serializedLibrary.showSidebar;
    if (serializedLibrary.totalUnit) this.totalUnit = serializedLibrary.totalUnit;
    if (serializedLibrary.itemUnit) this.itemUnit = serializedLibrary.itemUnit;
    if (serializedLibrary.currencySymbol) this.currencySymbol = serializedLibrary.currencySymbol;

    this.version = serializedLibrary.version;
    this.sequence = serializedLibrary.sequence;
    this.defaultListId = serializedLibrary.defaultListId || (this.lists.length ? this.lists[0].id : 1);
};

Library.prototype.upgrade01to02 = function (serializedLibrary) {
    if (!serializedLibrary.optionalFields) {
        serializedLibrary.optionalFields = assignIn({}, defaultOptionalFields);
    }

    if (serializedLibrary.showImages) {
        serializedLibrary.optionalFields.images = true;
    } else {
        serializedLibrary.optionalFields.images = false;
    }
    serializedLibrary.version = '0.2';
};

Library.prototype.upgrade02to03 = function (serializedLibrary) {
    this.sequenceShouldBeCorrect(serializedLibrary);
    this.idsShouldBeInts(serializedLibrary);
    this.renameCategoryIds(serializedLibrary);
    this.fixDuplicateIds(serializedLibrary);
    serializedLibrary.version = '0.3';
};

Library.prototype.sequenceShouldBeCorrect = function (serializedLibrary) {
    let sequence = 0;

    serializedLibrary.lists.forEach((list) => {
        if (list.id > sequence) {
            sequence = list.id;
        }
    });

    serializedLibrary.categories.forEach((category) => {
        if (category.id > sequence) {
            sequence = category.id;
        }
    });

    serializedLibrary.items.forEach((item) => {
        if (item.id > sequence) {
            sequence = item.id;
        }
    });
    serializedLibrary.sequence = (sequence + 1);
};

Library.prototype.idsShouldBeInts = function (serializedLibrary) {
    // Some lists of Ids were strings previously. They should be numbers.
    serializedLibrary.lists.forEach((list) => {
        list.categoryIds = list.categoryIds.map(categoryId => parseInt(categoryId, 10));
    });
};

Library.prototype.renameCategoryIds = function (serializedLibrary) {
    // categoryIds was previously itemIds. Renaming for clarity.
    serializedLibrary.categories.forEach((category) => {
        if (typeof category.itemIds !== 'undefined') {
            if (!category.categoryItems || category.categoryItems.length === 0) {
                category.categoryItems = category.itemIds;
                delete category.itemIds;
            } else {
                delete category.itemIds;
            }
        }
        if (typeof category.categoryItems === 'undefined') {
            category.categoryItems = [];
        }
    });
};

Library.prototype.fixDuplicateIds = function (serializedLibrary) {
    const foundIds = {};

    serializedLibrary.items.forEach((item) => {
        if (!foundIds[item.id]) {
            foundIds[item.id] = [];
        }
        foundIds[item.id].push({ type: 'item', item });
    });

    serializedLibrary.categories.forEach((category) => {
        if (!foundIds[category.id]) {
            foundIds[category.id] = [];
        }
        foundIds[category.id].push({ type: 'category', category });
    });

    serializedLibrary.lists.forEach((list) => {
        if (!foundIds[list.id]) {
            foundIds[list.id] = [];
        }
        foundIds[list.id].push({ type: 'list', list });
    });

    for (id in foundIds) {
        if (foundIds[id].length > 1) {
            const duplicateSet = foundIds[id];
            duplicateSet.forEach((duplicate, index) => {
                if (index === 0) {
                    return;
                }
                if (duplicate.type === 'item') {
                    this.updateItemId(serializedLibrary, duplicate.item, ++serializedLibrary.sequence);
                } else if (duplicate.type === 'category') {
                    this.updateCategoryId(serializedLibrary, duplicate.category, ++serializedLibrary.sequence);
                } else if (duplicate.type === 'list') {
                    this.updateListId(serializedLibrary, duplicate.list, ++serializedLibrary.sequence);
                }
            });
        }
    }
};

Library.prototype.updateListId = function (serializedLibrary, list, newId) {
    list.id = newId;
};

Library.prototype.updateCategoryId = function (serializedLibrary, category, newId) {
    const oldId = category.id;

    category.id = newId;

    serializedLibrary.lists.forEach((list) => {
        list.categoryIds.forEach((categoryId, index) => {
            if (categoryId === oldId) {
                list.categoryIds[index] = newId;
            }
        });
    });
};

Library.prototype.updateItemId = function (serializedLibrary, item, newId) {
    const oldId = item.id;

    item.id = newId;

    serializedLibrary.categories.forEach((category) => {
        category.categoryItems.forEach((categoryItem) => {
            if (categoryItem.itemId === oldId) {
                categoryItem.itemId = newId;
            }
        });
    });
};

module.exports = { Library };
