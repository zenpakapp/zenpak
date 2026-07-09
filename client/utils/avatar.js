function hashSeed(seed) {
    let h = 0;
    for (let i = 0; i < seed.length; i++) {
        h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
    }
    return Math.abs(h);
}

export function avatarColor(seed) {
    const hue = hashSeed(seed || 'user') % 360;
    return `hsl(${hue}, 58%, 46%)`;
}

export function avatarInitial(displayName, username) {
    return (displayName || username || '?').charAt(0).toUpperCase();
}
