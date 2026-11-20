'use strict';

// A Library with one List of two Categories, worked out by hand (weights in mg):
//   Gear : tent 1000 x1 | jacket 500 x2, worn | spare 200 x0 (optional)  -> total 2000, worn 500 (one unit), consumable 0
//   Food : meals 300 x3, consumable                                       -> total  900, worn   0, consumable 900
// List: total 2900, worn 500, consumable 900, base 2900-500-900 = 1500, pack 2900-500 = 2400, qty 6.
const { Library } = require('../../client/dataTypes.js');

function buildWeightedList() {
    const library = new Library();
    library.optionalFields.worn = true;
    library.optionalFields.consumable = true;
    const list = library.getListById(library.defaultListId);
    const gear = library.getCategoryById(list.categoryIds[0]);
    gear.name = 'Gear';
    const food = library.newCategory({ list });
    food.name = 'Food';

    const put = (category, weight, placement) => {
        const item = library.newItem({ category });
        library.updateItem({ ...item, weight });
        category.updateCategoryItem({ itemId: item.id, ...placement });
    };
    put(gear, 1000, { qty: 1 });
    put(gear, 500, { qty: 2, worn: 1 });
    put(gear, 200, { qty: 0 });
    put(food, 300, { qty: 3, consumable: true });
    list.calculateTotals();
    return {
        library, list, gear, food,
    };
}

module.exports = { buildWeightedList };
