const assignIn = require('lodash/assignIn');

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
    const idx = this.categoryItems.indexOf(oldCategoryItem);
    if (idx !== -1) this.categoryItems.splice(idx, 1, newCategoryItem);
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
        this.subtotalWeight += item.weight * categoryItem.qty;
        this.subtotalPrice += item.price * categoryItem.qty;

        if (this.library.optionalFields.worn && categoryItem.worn) {
            this.subtotalWornWeight += item.weight * ((categoryItem.qty > 0) ? 1 : 0);
        }
        if (this.library.optionalFields.consumable && categoryItem.consumable) {
            this.subtotalConsumableWeight += item.weight * categoryItem.qty;
            this.subtotalConsumablePrice += item.price * categoryItem.qty;
        }
        this.subtotalQty += categoryItem.qty;
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
    delete out.template;
    delete out._isNew;

    return out;
};

Category.prototype.load = function (input) {
    delete input._isNew;

    assignIn(this, input);

    this.categoryItems.forEach((categoryItem, index) => {
        delete categoryItem._isNew;
        if (typeof categoryItem.price !== 'undefined') {
            delete categoryItem.price;
        }
        if (!categoryItem.star) {
            categoryItem.star = 0;
        }
        if (!this.library.getItemById(categoryItem.itemId)) {
            this.categoryItems.splice(index, 1);
        }
    });
};

module.exports = { Category };
