const SATURATION = 58;
const BASE_LIGHTNESS = 46;
const MIN_LIGHTNESS = 20;
// The initial is white. 4.5:1 is the WCAG AA ratio for text this small.
const MIN_CONTRAST = 4.5;

function hashSeed(seed) {
    let h = 0;
    for (let i = 0; i < seed.length; i++) {
        h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
    }
    return Math.abs(h);
}

function hslToRgb(hue, saturation, lightness) {
    const s = saturation / 100;
    const l = lightness / 100;
    const a = s * Math.min(l, 1 - l);
    const channel = (n) => {
        const k = (n + hue / 30) % 12;
        return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    };
    return [channel(0), channel(8), channel(4)];
}

function relativeLuminance([r, g, b]) {
    const linear = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

// Contrast of a white letter on the colour. Yellows and greens look lighter than blues at the
// same lightness, so they reach the ratio later.
export function contrastWithWhite(hue, lightness) {
    return 1.05 / (relativeLuminance(hslToRgb(hue, SATURATION, lightness)) + 0.05);
}

export function avatarColor(seed) {
    const hue = hashSeed(seed || 'user') % 360;
    let lightness = BASE_LIGHTNESS;
    while (lightness > MIN_LIGHTNESS && contrastWithWhite(hue, lightness) < MIN_CONTRAST) {
        lightness -= 1;
    }
    return `hsl(${hue}, ${SATURATION}%, ${lightness}%)`;
}

export function avatarInitial(displayName, username) {
    return (displayName || username || '?').charAt(0).toUpperCase();
}
