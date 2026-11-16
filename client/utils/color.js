module.exports = (function () {
    function getColor(index, baseColor) {
        if (baseColor) {
            const hsv = rgbToHsv(baseColor);
            hsv.s -= Math.round(((hsv.s) / 10) * (index % 10));
            hsv.v += Math.round(((100 - hsv.v) / 10) * (index % 10));
            return hsvToRgb(hsv);
        }
        // Default category colours, in the order categories get them: ZenPak green first, then
        // earth tones that stay apart from each other on the donut (checked by test/unit-category-palette.js).
        const colors = [
            { r: 45, g: 122, b: 79 },
            { r: 217, g: 154, b: 43 },
            { r: 194, g: 84, b: 58 },
            { r: 74, g: 106, b: 143 },
            { r: 155, g: 179, b: 106 },
            { r: 122, g: 74, b: 110 },
            { r: 216, g: 196, b: 147 },
            { r: 64, g: 168, b: 156 },
            { r: 184, g: 107, b: 134 },
            { r: 100, g: 70, b: 40 },
            { r: 143, g: 179, b: 201 },
        ];
        // Past the eleventh category the palette comes round again: darker the second time, lighter
        // the third, so the last slice never has the colour of the first one beside it.
        // list.js passes the key of a for...in loop, a string: "1" + 2 would be "12", not 3.
        const position = Number(index);
        const cycle = Math.floor(position / colors.length) % 3;
        // Each round starts two colours further on, so the wrap-around neighbours stay apart.
        const base = colors[(position + cycle * 2) % colors.length];
        if (cycle === 1) return { r: Math.round(base.r * 0.5), g: Math.round(base.g * 0.5), b: Math.round(base.b * 0.5) };
        if (cycle === 2) return { r: Math.round(base.r + (255 - base.r) * 0.4), g: Math.round(base.g + (255 - base.g) * 0.4), b: Math.round(base.b + (255 - base.b) * 0.4) };
        return base;
    }

    function hsvToRgb(hsv) {
        let r; let g; let b; let i; let f; let p; let q; let
            t;
        const h = hsv.h / 360;
        const s = hsv.s / 100;
        const v = hsv.v / 100;

        i = Math.floor(h * 6);
        f = h * 6 - i;
        p = v * (1 - s);
        q = v * (1 - f * s);
        t = v * (1 - (1 - f) * s);
        switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
        }
        return {
            r: Math.floor(r * 255),
            g: Math.floor(g * 255),
            b: Math.floor(b * 255),
        };
    }

    function rgbToHsv(rgb) {
        let rr; let gg; let bb;
        const r = rgb.r / 255;
        const g = rgb.g / 255;
        const b = rgb.b / 255;
        let h; let s;
        const v = Math.max(r, g, b);
        const diff = v - Math.min(r, g, b);
        const diffc = function (c) {
            return (v - c) / 6 / diff + 1 / 2;
        };

        if (diff == 0) {
            h = s = 0;
        } else {
            s = diff / v;
            rr = diffc(r);
            gg = diffc(g);
            bb = diffc(b);

            if (r === v) {
                h = bb - gg;
            } else if (g === v) {
                h = (1 / 3) + rr - bb;
            } else if (b === v) {
                h = (2 / 3) + gg - rr;
            }
            if (h < 0) {
                h += 1;
            } else if (h > 1) {
                h -= 1;
            }
        }
        return {
            h: Math.round(h * 360),
            s: Math.round(s * 100),
            v: Math.round(v * 100),
        };
    }

    // A colour comes from saved data, and the result is written into style attributes on the share
    // pages, so each channel is forced to a whole number from 0 to 255.
    function channel(value) {
        return Math.max(0, Math.min(255, parseInt(value, 10) || 0));
    }

    function rgbToString(rgb) {
        return `rgb(${channel(rgb.r)},${channel(rgb.g)},${channel(rgb.b)})`;
    }

    function stringToRgb(rgbString) {
        rgbString = rgbString.substring(4, rgbString.length - 1);
        const split = rgbString.split(',');
        return {
            r: parseInt(split[0]),
            g: parseInt(split[1]),
            b: parseInt(split[2]),
        };
    }

    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
        } : null;
    }

    function rgbToHex(rgb) {
        return `#${componentToHex(rgb.r)}${componentToHex(rgb.g)}${componentToHex(rgb.b)}`;
    }

    function componentToHex(c) {
        const hex = c.toString(16);
        return hex.length == 1 ? `0${hex}` : hex;
    }
    return {
        getColor,
        hsvToRgb,
        rgbToHsv,
        rgbToString,
        stringToRgb,
        hexToRgb,
        rgbToHex,
    };
}());
