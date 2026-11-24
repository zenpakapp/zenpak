module.exports = (function () {
    function WeightToMg(value, unit) {
        if (unit == 'g') {
            return value * 1000;
        } if (unit == 'kg') {
            return value * 1000000;
        } if (unit == 'oz') {
            return value * 28349.5;
        } if (unit == 'lb') {
            return value * 453592;
        }
    }

    const MG_PER_UNIT = {
        g: 1000, kg: 1000000, oz: 28349.5, lb: 453592,
    };

    function MgToWeight(value, unit, display) {
        const perUnit = MG_PER_UNIT[unit];
        if (!Number.isFinite(perUnit) || (unit === 'lb' && display)) return undefined;

        const scale = unit === 'g' ? 1 : 100;
        const rounded = Math.round(scale * value / perUnit) / scale;
        // Keep the chosen unit and add precision only when rounding would show a positive weight as zero.
        return rounded === 0 && value > 0 ? Number((value / perUnit).toPrecision(3)) : rounded;
    }

    // Largest rounding error accepted when showing a single item's weight.
    const MAX_ITEM_ROUNDING_ERROR = 0.02;

    // Editable item weights need more precision than totals so re-saving does not change them.
    // Add decimals until the shown value is within 2% of the stored one.
    function MgToItemWeight(value, unit) {
        const perUnit = MG_PER_UNIT[unit];
        if (!perUnit) return MgToWeight(value, unit);

        const exact = (Number(value) || 0) / perUnit;
        if (exact === 0) return 0;

        for (let decimals = unit === 'g' ? 0 : 2; decimals < 6; decimals += 1) {
            const rounded = Number(exact.toFixed(decimals));
            if (Math.abs(rounded - exact) / exact <= MAX_ITEM_ROUNDING_ERROR) return rounded;
        }
        return Number(exact.toFixed(6));
    }

    return {
        WeightToMg,
        MgToWeight,
        MgToItemWeight,
    };
}());
