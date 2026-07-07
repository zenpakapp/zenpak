const assignIn = require('lodash/assignIn');

const Item = function ({ id, unit }) {
    this.id = id;
    this.name = '';
    this.description = '';
    this.weight = 0;
    this.authorUnit = 'oz';
    if (unit) {
        this.authorUnit = unit;
    }
    this.price = 0.00;
    this.image = '';
    this.imageUrl = '';
    this.url = '';
    this.shop = '';
    this.affiliateUrl = '';
    this.promoCode = '';
    this.promoLabel = '';
    this.brand = '';
    this.category = '';
    this.tags = [];

    return this;
};

Item.prototype.save = function () {
    return this;
};

Item.prototype.load = function (input) {
    assignIn(this, input);
    if (typeof this.price === 'string') {
        const parsed = parseFloat(this.price, 10);
        this.price = isNaN(parsed) ? 0 : parsed;
    }
    if (typeof this.price !== 'number' || isNaN(this.price)) this.price = 0;
};

module.exports = { Item };
