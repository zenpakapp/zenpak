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

    function MgToWeight(value, unit, display) {
        if (typeof display === 'undefined') display = false;
        if (unit == 'g') {
            return Math.round(value / 1000.0);
        } if (unit == 'kg') {
            return Math.round(100 * value / 1000000.0, 2) / 100;
        } if (unit == 'oz') {
            return Math.round(100 * value / 28349.5, 2) / 100;
        } if (unit == 'lb') {
            if (display) {
                let out = '';
                const poundsFloat = value / 453592.0;
                const pounds = Math.floor(poundsFloat);
                const oz = Math.round((poundsFloat % 1) * 16 * 100) / 100;
                if (pounds) {
                    out += 'lb';
                    if (pounds > 1) out += 's';
                }
            } else {
                return Math.round(100 * value / 453592.0, 2) / 100;
            }
        }
    }

    const MG_PER_UNIT = {
        g: 1000, kg: 1000000, oz: 28349.5, lb: 453592,
    };
    // Largest rounding error accepted when showing a single item's weight.
    const MAX_ITEM_ROUNDING_ERROR = 0.02;

    // Weight of one item as shown to the user. MgToWeight rounds (whole grams, 2 decimals
    // elsewhere), which shows a 4 g item as 0 kg and turns a re-saved 1 g into 1.13 g. Here the
    // decimals grow until the shown value is within 2% of the stored one, so exact values keep
    // their usual display and light items stay visible. Totals keep using MgToWeight.
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
