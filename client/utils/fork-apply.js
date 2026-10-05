// CommonJS so test/unit-*.js can require it. Mutates a Library in place; the store mutation
// wraps it. Never throws on bad links: forkedFrom links are untrusted hints.
const { Category } = require('../models/category.js');
const { copiedItemSignature } = require('./item-signature.js');
const { planUpdate, findPayloadItem, PLACEMENT_FIELDS } = require('./fork-apply-plan.js');

const sameId = (a, b) => String(a) === String(b);
const clone = (value) => JSON.parse(JSON.stringify(value));

function placementValues(payloadItem) {
    return {
        qty: Number(payloadItem.qty), worn: payloadItem.worn || 0, consumable: payloadItem.consumable === true, star: payloadItem.star || 0,
    };
}

const realItem = (library, id) => library.items.find((item) => item && sameId(item.id, id)) || null;
const ownsCategory = (list, id) => list.categoryIds.some((own) => sameId(own, id));
const recalculateAll = (library) => library.lists.forEach((entry) => entry.calculateTotals());

function takeUndoSnapshot(library, list) {
    const forked = list.forkedFrom;
    const itemLinks = Array.isArray(forked.itemLinks) ? forked.itemLinks : [];
    const linkedItemIds = [...new Set(itemLinks.map((link) => String(link.itemId)))];
    return {
        fromVersion: forked.version,
        takenAt: new Date().toISOString(),
        itemLinks: clone(itemLinks),
        categoryLinks: clone(Array.isArray(forked.categoryLinks) ? forked.categoryLinks : []),
        dismissedVersion: forked.dismissedVersion,
        listMeta: clone({ description: list.description, seasons: list.seasons, listTypes: list.listTypes }),
        categoryIds: list.categoryIds.slice(),
        categories: list.categoryIds.map((id) => library.getCategoryById(id)).filter(Boolean).map((entry) => ({
            id: entry.id, name: entry.name, color: entry.color, categoryItems: clone(entry.categoryItems),
        })),
        items: linkedItemIds.map((id) => realItem(library, id)).filter(Boolean).map((item) => clone(item)),
        createdItemIds: [],
    };
}

function applyUpdate(library, list, basePayload, latestPayload, toVersion) {
    const plan = planUpdate(basePayload, latestPayload);
    const forked = list.forkedFrom;
    const snapshot = takeUndoSnapshot(library, list);
    const itemLinks = clone(snapshot.itemLinks);
    const categoryLinks = clone(snapshot.categoryLinks);

    const localCategory = (sourceCategoryId) => {
        const link = categoryLinks.find((entry) => sameId(entry.sourceCategoryId, sourceCategoryId));
        const found = link ? library.getCategoryById(link.categoryId) : null;
        return found && list.categoryIds.map(String).includes(String(found.id)) ? found : null;
    };
    const linkFor = (sourceItemId, categoryId) => itemLinks.find((entry) => sameId(entry.sourceItemId, sourceItemId)
        && (categoryId === undefined || sameId(entry.categoryId, categoryId)));

    // 1. Added categories first, so added items below can find them.
    plan.addedCategories.forEach((entry) => {
        if (localCategory(entry.id)) return;
        const created = library.newCategory({ list, _isNew: false });
        created.name = entry.name;
        categoryLinks.push({ categoryId: created.id, sourceCategoryId: entry.id });
    });

    // 2. Added placements: reuse the linked local item when there is one, else merge by signature, else create.
    plan.added.forEach(({ item: summary, category: sourceCategory }) => {
        const target = localCategory(sourceCategory.id);
        const payloadItem = findPayloadItem(latestPayload, sourceCategory.id, summary.id);
        if (!target || !payloadItem) return;
        const existingLink = linkFor(summary.id);
        let item = existingLink ? library.getItemById(existingLink.itemId) : null;
        if (!item) {
            const signature = copiedItemSignature(payloadItem);
            item = payloadItem.name ? library.items.find((candidate) => copiedItemSignature(candidate) === signature) : null;
        }
        if (!item) {
            item = library.newItem({ category: target, _isNew: false });
            snapshot.createdItemIds.push(item.id);
            Object.assign(item, {
                name: payloadItem.name || '',
                description: payloadItem.description || '',
                brand: payloadItem.brand || '',
                shop: payloadItem.shop || '',
                weight: Number(payloadItem.weight) || 0,
                authorUnit: library.itemUnit || 'g',
                price: latestPayload.publicFields && latestPayload.publicFields.price ? Number(payloadItem.price) || 0 : 0,
            });
            if (latestPayload.publicFields && latestPayload.publicFields.links && !payloadItem.hasAffiliateLink) item.url = payloadItem.publicUrl || '';
            if (latestPayload.publicFields && latestPayload.publicFields.images) item.imageUrl = payloadItem.imageUrl || '';
        } else if (!target.getCategoryItemById(item.id)) {
            target.addItem({ itemId: item.id, _isNew: false });
        }
        Object.assign(target.getCategoryItemById(item.id), placementValues(payloadItem));
        itemLinks.push({ categoryId: target.id, itemId: item.id, sourceItemId: summary.id });
    });

    // 3. Moved placements.
    plan.moved.forEach((entry) => {
        const from = localCategory(entry.fromCategory.id);
        const to = localCategory(entry.toCategory.id);
        const link = from ? linkFor(entry.item.id, from.id) : null;
        const payloadItem = findPayloadItem(latestPayload, entry.toCategory.id, entry.item.id);
        if (!from || !to || !link || !payloadItem) return;
        from.removeItem(link.itemId);
        if (!to.getCategoryItemById(link.itemId)) to.addItem({ itemId: link.itemId, _isNew: false });
        Object.assign(to.getCategoryItemById(link.itemId), placementValues(payloadItem));
        link.categoryId = to.id;
    });

    // 4. Modified fields. A change with a category applies to that placement only.
    plan.modified.forEach((entry) => {
        const links = itemLinks.filter((link) => sameId(link.sourceItemId, entry.item.id));
        entry.changes.forEach((change) => {
            if (PLACEMENT_FIELDS.includes(change.localField)) {
                links.forEach((link) => {
                    const owner = ownsCategory(list, link.categoryId) ? library.getCategoryById(link.categoryId) : null;
                    const sourceLink = categoryLinks.find((c) => sameId(c.categoryId, link.categoryId));
                    if (change.category && (!sourceLink || !sameId(sourceLink.sourceCategoryId, change.category.id))) return;
                    const placement = owner && owner.getCategoryItemById(link.itemId);
                    if (placement) placement[change.localField] = change.localField === 'consumable' ? change.to === true : Number(change.to) || 0;
                });
                return;
            }
            const localItem = links[0] ? library.getItemById(links[0].itemId) : null;
            if (!localItem) return;
            const numeric = change.localField === 'weight' || change.localField === 'price';
            localItem[change.localField] = numeric ? Number(change.to) || 0 : change.to || '';
        });
    });

    // 5. Renamed categories, 6. list meta (never the name).
    plan.categoriesRenamed.forEach((entry) => {
        const target = localCategory(entry.id);
        if (target) target.name = entry.to;
    });
    plan.meta.forEach((change) => {
        list[change.field] = Array.isArray(change.to) ? change.to.slice() : change.to;
    });

    // 7. Removed placements: the item stays in the library, only its place and link go.
    plan.removed.forEach(({ item: summary, category: sourceCategory }) => {
        const target = localCategory(sourceCategory.id);
        const link = target ? linkFor(summary.id, target.id) : null;
        if (!target || !link) return;
        target.removeItem(link.itemId);
        itemLinks.splice(itemLinks.indexOf(link), 1);
    });

    // 8. Removed source categories: drop the link; delete the local category only if it is now empty.
    plan.removedCategories.forEach((entry) => {
        const link = categoryLinks.find((candidate) => sameId(candidate.sourceCategoryId, entry.id));
        if (!link) return;
        categoryLinks.splice(categoryLinks.indexOf(link), 1);
        const target = library.getCategoryById(link.categoryId);
        if (target && ownsCategory(list, target.id) && target.categoryItems.length === 0) library.removeCategory(target.id);
    });

    list.forkedFrom = {
        ...forked, version: toVersion, itemLinks, categoryLinks, undo: snapshot,
    };
    recalculateAll(library);
}

function usedElsewhere(library, list, itemId) {
    return library.lists.some((other) => other !== list && other.categoryIds.some((id) => {
        const entry = library.getCategoryById(id);
        return entry && entry.getCategoryItemById(itemId);
    }));
}

function undoUpdate(library, list) {
    const snapshot = list && list.forkedFrom && list.forkedFrom.undo;
    if (!snapshot) return false;

    const snapshotIds = snapshot.categories.map((entry) => String(entry.id));
    // Categories the update created are not in the snapshot: remove them.
    list.categoryIds.filter((id) => !snapshotIds.includes(String(id))).forEach((id) => library.removeCategory(id, true));
    // Categories the update deleted come back with their original id.
    snapshot.categories.forEach((saved) => {
        let restored = library.getCategoryById(saved.id);
        if (!restored) {
            restored = new Category({ id: saved.id, _isNew: false, library });
            library.categories.push(restored);
            library.idMap[restored.id] = restored;
        }
        restored.name = saved.name;
        if (saved.color !== undefined) restored.color = saved.color;
        restored.categoryItems = clone(saved.categoryItems);
    });
    list.categoryIds = snapshot.categoryIds.slice();

    snapshot.createdItemIds.forEach((id) => {
        if (!usedElsewhere(library, list, id)) library.removeItem(id);
    });
    snapshot.items.forEach((saved) => {
        const current = realItem(library, saved.id);
        if (current) Object.assign(current, clone(saved));
    });
    // Items the user deleted after the update must not leave dangling placements.
    snapshot.categories.forEach((saved) => {
        const restored = library.getCategoryById(saved.id);
        if (restored) restored.categoryItems = restored.categoryItems.filter((entry) => realItem(library, entry.itemId));
    });

    Object.assign(list, clone(snapshot.listMeta));
    const restoredFork = { ...list.forkedFrom, version: snapshot.fromVersion };
    restoredFork.itemLinks = clone(snapshot.itemLinks);
    restoredFork.categoryLinks = clone(snapshot.categoryLinks);
    delete restoredFork.undo;
    if (snapshot.dismissedVersion === undefined) delete restoredFork.dismissedVersion;
    else restoredFork.dismissedVersion = snapshot.dismissedVersion;
    list.forkedFrom = restoredFork;
    recalculateAll(library);
    return true;
}

module.exports = { applyUpdate, undoUpdate, takeUndoSnapshot };
