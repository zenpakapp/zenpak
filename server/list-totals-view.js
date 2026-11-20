const Mustache = require('mustache');

const weightUtils = require('../client/utils/weight.js');
const { formatDisplayPrice } = require('../client/utils/currency.js');

// The totals of a list as the embed and print pages show them: the numbers come from the list model
// (List.calculateTotals), this file only converts the units and formats them into the Mustache templates.
const renderListTotals = function (list, totalsTemplate, unitSelectTemplate, unit, t) {
    list.calculateTotals();
    const out = { categories: [] };

    for (const i in list.categoryIds) {
        const category = list.library.getCategoryById(list.categoryIds[i]);

        if (category) {
            category.subtotalWeightDisplay = weightUtils.MgToWeight(category.subtotalWeight, unit);
            category.subtotalUnit = unit;
            out.categories.push(category);
        }
    }

    out.totalWeight = list.totalWeight;
    out.totalWeightDisplay = weightUtils.MgToWeight(list.totalWeight, unit);
    out.totalUnit = renderUnitSelect(unit, unitSelectTemplate, list.totalWeight);
    out.subtotalUnit = unit;
    out.totalWornWeight = list.totalWornWeight;
    out.totalWornWeightDisplay = weightUtils.MgToWeight(list.totalWornWeight, unit);
    out.totalConsumableWeight = list.totalConsumableWeight;
    out.totalConsumableWeightDisplay = weightUtils.MgToWeight(list.totalConsumableWeight, unit);
    out.totalBaseWeight = list.totalBaseWeight;
    out.totalBaseWeightDisplay = weightUtils.MgToWeight(list.totalBaseWeight, unit);
    out.shouldDisplayBaseWeight = list.totalBaseWeight !== list.totalWeight;
    out.totalQty = list.totalQty;
    out.totalPrice = list.totalPrice;
    out.totalPriceDisplay = formatDisplayPrice(list.totalPrice || 0, list.library.currencySymbol);
    out.totalConsumablePrice = list.totalConsumablePrice;
    out.totalConsumablePriceDisplay = formatDisplayPrice(list.totalConsumablePrice || 0, list.library.currencySymbol);
    out.showPrices = Boolean(list.library.optionalFields.price && list.publicFields && list.publicFields.price);

    if (t) out.t = t;
    return Mustache.render(totalsTemplate, out);
};

var renderLibraryTotals = function (library, totalsTemplate, unitSelectTemplate, t) {
    return renderListTotals(library.getListById(library.defaultListId), totalsTemplate, unitSelectTemplate, library.totalUnit, t);
};

function renderUnitSelect(unit, unitSelectTemplate, weight) {
    const temp = { unit, units: [{ unit: 'oz', selected: (unit === 'oz') }, { unit: 'lb', selected: (unit === 'lb') }, { unit: 'g', selected: (unit === 'g') }, { unit: 'kg', selected: (unit === 'kg') }], weight };
    return Mustache.render(unitSelectTemplate, temp);
}

module.exports = { renderListTotals, renderLibraryTotals, renderUnitSelect };
