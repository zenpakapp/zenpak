const assignIn = require('lodash/assignIn');

const colorUtils = require('../utils/color.js');
const weightUtils = require('../utils/weight.js');
const { VISIBILITY_PRIVATE } = require('../services/public-visibility.js');

const List = function ({ id, library }) {
    this.library = library;
    this.id = id;
    this.name = '';
    this.categoryIds = [];
    this.chart = null;
    this.description = '';
    this.summary = '';
    this.seasons = [];
    this.listTypes = [];
    this.visibility = VISIBILITY_PRIVATE;
    this.allowSearchIndexing = false;
    this.externalId = '';

    this.totalWeight = 0;
    this.totalWornWeight = 0;
    this.totalConsumableWeight = 0;
    this.totalBaseWeight = 0;
    this.totalPackWeight = 0;
    this.totalPrice = 0;
    this.totalConsumablePrice = 0;
    this.totalQty = 0;

    return this;
};

List.prototype.addCategory = function (categoryId) {
    this.categoryIds.push(categoryId);
};

List.prototype.removeCategory = function (categoryId) {
    categoryId = parseInt(categoryId);
    let index = this.categoryIds.indexOf(categoryId);
    if (index == -1) {
        index = this.categoryIds.indexOf(`${categoryId}`);
        if (index == -1) {
            console.warn(`Unable to delete category, it does not exist in this list:${categoryId}`);
            return false;
        }
    }

    this.categoryIds.splice(index, 1);
    return true;
};

List.prototype.renderChart = function (type, linkParent) {
    const chartData = { points: {} };
    let total = 0;

    if (typeof linkParent === 'undefined') linkParent = true;

    for (var i in this.categoryIds) {
        var category = this.library.getCategoryById(this.categoryIds[i]);
        if (category) {
            category.calculateSubtotal();

            if (type === 'consumable') {
                total += category.subtotalConsumableWeight;
            } else if (type === 'worn') {
                total += category.subtotalWornWeight;
            } else if (type === 'base') {
                total += (category.subtotalWeight - (category.subtotalConsumableWeight + category.subtotalWornWeight));
            } else { // total weight
                total += category.subtotalWeight;
            }
        }
    }

    if (!total) return false;

    const getTooltipText = function (name, valueMg, unit) {
        return `${name}: ${weightUtils.MgToWeight(valueMg, unit)} ${unit}`;
    };

    for (var i in this.categoryIds) {
        var category = this.library.getCategoryById(this.categoryIds[i]);
        if (category) {
            const points = {};

            var categoryTotal;
            if (type === 'consumable') {
                categoryTotal = category.subtotalConsumableWeight;
            } else if (type === 'worn') {
                categoryTotal = category.subtotalWornWeight;
            } else if (type === 'base') {
                categoryTotal = (category.subtotalWeight - (category.subtotalConsumableWeight + category.subtotalWornWeight));
            } else { // total weight
                categoryTotal = category.subtotalWeight;
            }

            const tempColor = category.color || colorUtils.getColor(i);
            category.displayColor = colorUtils.rgbToString(tempColor);
            const tempCategory = {};

            for (const j in category.categoryItems) {
                const item = category.getExtendedItemByIndex(j);
                let value = item.weight * item.qty;
                if (!value) value = 0;
                let name = getTooltipText(item.name, value, item.authorUnit);
                const color = colorUtils.getColor(j, tempColor);
                if (item.qty > 1) name += ` x ${item.qty}`;
                var percent = value / categoryTotal;
                const tempItem = {
                    value, id: item.id, name, color, percent,
                };
                if (linkParent) tempItem.parent = tempCategory;
                points[j] = tempItem;
            }
            var percent = categoryTotal / total;
            const tempCategoryData = {
                points, color: category.color, id: category.id, name: getTooltipText(category.name, categoryTotal, this.library.totalUnit), total: categoryTotal, percent, visiblePoints: false,
            };
            if (linkParent) tempCategoryData.parent = chartData;
            assignIn(tempCategory, tempCategoryData);
            chartData.points[i] = tempCategory;
        }
    }
    chartData.total = total;

    return chartData;
};

List.prototype.calculateTotals = function () {
    let totalWeight = 0;
    let totalPrice = 0;
    let totalWornWeight = 0;
    let totalConsumableWeight = 0;
    let totalConsumablePrice = 0;
    let totalBaseWeight = 0;
    let totalPackWeight = 0;
    let totalQty = 0;
    const out = { categories: [] };

    for (const i in this.categoryIds) {
        const category = this.library.getCategoryById(this.categoryIds[i]);

        if (category) {
            category.calculateSubtotal();

            totalWeight += category.subtotalWeight;
            totalWornWeight += category.subtotalWornWeight;
            totalConsumableWeight += category.subtotalConsumableWeight;

            totalPrice += category.subtotalPrice;
            totalConsumablePrice += category.subtotalConsumablePrice;

            totalQty += category.subtotalQty;

            out.categories.push(category);
        }
    }

    totalBaseWeight = totalWeight - (totalWornWeight + totalConsumableWeight);
    totalPackWeight = totalWeight - totalWornWeight;

    this.totalWeight = totalWeight;
    this.totalWornWeight = totalWornWeight;
    this.totalConsumableWeight = totalConsumableWeight;

    this.totalBaseWeight = totalBaseWeight;
    this.totalPackWeight = totalPackWeight;

    this.totalPrice = totalPrice;
    this.totalConsumablePrice = totalConsumablePrice;

    this.totalQty = totalQty;
};

List.prototype.save = function () {
    const out = assignIn({}, this);
    delete out.library;
    delete out.chart;
    return out;
};

List.prototype.load = function (input) {
    assignIn(this, input);
    this.calculateTotals();
};

module.exports = { List };
