const assignIn = require('../utils/assign-in.js');

const Category = function ({ library, id, _isNew }) {
    this.library = library;
    this.id = id;
    this.name = '';
    this.categoryItems = [];

    this.subtotalWeight = 0;
    this.subtotalWornWeight = 0;
    this.subtotalConsumableWeight = 0;
    this.subtotalPrice = 0;
    this.subtotalConsumablePrice = 0;
    this.subtotalQty = 0;

    this._isNew = _isNew;
    return this;
};

Category.prototype.addItem = function (partialCategoryItem) {
    const tempCategoryItem = {
        qty: 1,
        worn: 0,
        consumable: false,
        star: 0,
        itemId: null,
        _isNew: false,
    };
    assignIn(tempCategoryItem, partialCategoryItem);
    this.categoryItems.push(tempCategoryItem);
};

Category.prototype.updateCategoryItem = function (categoryItem) {
    const oldCategoryItem = this.getCategoryItemById(categoryItem.itemId);
    const newCategoryItem = assignIn({}, oldCategoryItem, categoryItem);

    if (typeof categoryItem.qty !== 'undefined' && categoryItem.qty !== oldCategoryItem.qty) {
        delete newCategoryItem.qtyBeforeOptional;
    }

    const idx = this.categoryItems.indexOf(oldCategoryItem);
    if (idx !== -1) this.categoryItems.splice(idx, 1, newCategoryItem);
};

Category.prototype.toggleOptionalItem = function (itemId) {
    const categoryItem = this.getCategoryItemById(itemId);
    if (!categoryItem) return;

    const updatedCategoryItem = { ...categoryItem };
    if (categoryItem.qty > 0) {
        updatedCategoryItem.qtyBeforeOptional = categoryItem.qty;
        updatedCategoryItem.qty = 0;
    } else {
        updatedCategoryItem.qty = categoryItem.qtyBeforeOptional || 1;
        delete updatedCategoryItem.qtyBeforeOptional;
    }

    const idx = this.categoryItems.indexOf(categoryItem);
    if (idx !== -1) this.categoryItems.splice(idx, 1, updatedCategoryItem);
};

Category.prototype.removeItem = function (itemId) {
    const categoryItem = this.getCategoryItemById(itemId);
    const index = this.categoryItems.indexOf(categoryItem);
    if (index !== -1) this.categoryItems.splice(index, 1);
};

Category.prototype.calculateSubtotal = function () {
    this.subtotalWeight = 0;
    this.subtotalWornWeight = 0;
    this.subtotalConsumableWeight = 0;
    this.subtotalPrice = 0;
    this.subtotalConsumablePrice = 0;
    this.subtotalQty = 0;

    for (const i in this.categoryItems) {
        const categoryItem = this.categoryItems[i];
        const item = this.library.getItemById(categoryItem.itemId);
        if (!item) {
            continue;
        }
        const weight = isNaN(item.weight) ? 0 : item.weight;
        const price = isNaN(item.price) ? 0 : item.price;
        const qty = isNaN(categoryItem.qty) ? 0 : categoryItem.qty;

        this.subtotalWeight += weight * qty;
        this.subtotalPrice += price * qty;

        if (this.library.optionalFields.worn && categoryItem.worn) {
            this.subtotalWornWeight += weight * ((qty > 0) ? 1 : 0);
        }
        if (this.library.optionalFields.consumable && categoryItem.consumable) {
            this.subtotalConsumableWeight += weight * qty;
            this.subtotalConsumablePrice += price * qty;
        }
        this.subtotalQty += qty;
    }
};

Category.prototype.getCategoryItemById = function (id) {
    for (const i in this.categoryItems) {
        const categoryItem = this.categoryItems[i];
        if (categoryItem.itemId == id) return categoryItem;
    }
    return null;
};

Category.prototype.getExtendedItemByIndex = function (index) {
    const categoryItem = this.categoryItems[index];
    const item = this.library.getItemById(categoryItem.itemId);
    const extendedItem = assignIn({}, item);
    assignIn(extendedItem, categoryItem);
    return extendedItem;
};

Category.prototype.save = function () {
    const out = assignIn({}, this);

    delete out.library;
    delete out._isNew;

    return out;
};

Category.prototype.load = function (input) {
    delete input._isNew;

    assignIn(this, input);

    this.categoryItems.forEach((categoryItem) => {
        delete categoryItem._isNew;
        if (typeof categoryItem.price !== 'undefined') {
            delete categoryItem.price;
        }
        if (!categoryItem.star) {
            categoryItem.star = 0;
        }
    });
    this.categoryItems = this.categoryItems.filter((categoryItem) => this.library.getItemById(categoryItem.itemId));
};

module.exports = { Category };
