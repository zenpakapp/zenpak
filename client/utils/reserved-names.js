function normalizeName(value) {
    return String(value || '')
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[-_\s.]/g, '')
        .replace(/3/g, 'e')
        .replace(/0/g, 'o')
        .replace(/1/g, 'i')
        .replace(/@/g, 'a');
}

export function isReservedDisplayName(value) {
    const normalized = normalizeName(value);
    if (!normalized) return false;
    if (['admin', 'api', 'app', 'moderator', 'official', 'support', 'www'].includes(normalized)) return true;
    return /^zenpa[cgkq]/.test(normalized);
}
