function cloneLibraryData(libraryData) {
    return JSON.parse(JSON.stringify(libraryData));
}

function normalizeSetup(setup) {
    const normalized = setup || {};
    const units = normalized.units === 'imperial'
        ? { itemUnit: 'oz', totalUnit: 'lb' }
        : { itemUnit: 'g', totalUnit: 'kg' };

    return {
        ...units,
        currencySymbol: String(normalized.currencySymbol || '').trim() || '€',
        displayName: String(normalized.displayName || '').trim(),
        listName: String(normalized.listName || '').trim(),
    };
}

export function applyQuickSetup(libraryData, setup) {
    const data = cloneLibraryData(libraryData);
    const settings = normalizeSetup(setup);

    data.itemUnit = settings.itemUnit;
    data.totalUnit = settings.totalUnit;
    data.currencySymbol = settings.currencySymbol;

    if (!data.publicProfile) data.publicProfile = {};
    if (settings.displayName) data.publicProfile.displayName = settings.displayName;

    if (settings.listName && Array.isArray(data.lists)) {
        const firstList = data.lists.find(list => list.id === data.defaultListId) || data.lists[0];
        if (firstList) firstList.name = settings.listName;
    }

    return data;
}
