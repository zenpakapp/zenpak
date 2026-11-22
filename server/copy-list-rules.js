// Rules of copying a public list, kept apart from the route so they run without a database.
// Pure functions: they read objects the route already loaded and write nothing.

const { normalizeTagArray } = require('./text-limits.js');
const { publicImageUrl } = require('./public-image-url.js');

function normalizeCopiedQuantity(value) {
    const quantity = Number(value);
    return Number.isFinite(quantity) ? quantity : 1;
}

// Who may copy `sourceList` (the owner's own List, with its visibility). `owner` is null when the
// published version has no owner. Answers { ok: true } or { ok: false, status, message }.
// A List that is not copyable answers 404, like a List that does not exist: it is not revealed.
function canCopy({ owner, sourceList, user }) {
    if (!owner || owner.banned) return { ok: false, status: 404, message: 'List not found' };

    const visibility = sourceList && sourceList.visibility;
    const alwaysCopyable = visibility === 'discoverable' || visibility === 'indexable';
    const optInCopyable = visibility === 'shareable' && sourceList.copyable === true;
    if (!sourceList || (!alwaysCopyable && !optInCopyable)) {
        return { ok: false, status: 404, message: 'List not found' };
    }

    if (String(owner._id) === String(user._id)) {
        return { ok: false, status: 403, message: 'Cannot copy your own list' };
    }
    if (user.banned) return { ok: false, status: 403, message: 'Account suspended' };

    return { ok: true };
}

// What the copier receives: the published List (categories and Items) and where it comes from.
// The price is only given when the author shares it.
// `cloudName` is the Cloudinary account of this ZenPak: a picture hosted anywhere else is not copied,
// so a list cannot slip a tracking address into the library of whoever copies it.
function buildCopyPayload({
    version, owner, sourceList, now = new Date(), cloudName = '',
}) {
    const published = version.library;
    const publishedList = (published.lists || [])[0] || {};
    const sharesPrice = Boolean(publishedList.publicFields && publishedList.publicFields.price);

    const categoryIds = (publishedList.categoryIds || []).map(String);
    const categories = (published.categories || [])
        .filter((c) => categoryIds.includes(String(c.id)))
        .map((c) => ({
            sourceCategoryId: c.id,
            name: c.name,
            categoryItems: (c.categoryItems || []).map((ci) => {
                const item = (published.items || []).find((i) => String(i.id) === String(ci.itemId));
                if (!item) return null;
                return {
                    sourceItemId: item.id,
                    name: item.name || '',
                    description: item.description || '',
                    weight: Number(item.weight) || 0,
                    authorUnit: item.authorUnit || 'g',
                    price: sharesPrice ? Number(item.price) || 0 : 0,
                    brand: item.brand || '',
                    shop: item.shop || '',
                    url: item.url || '',
                    affiliateUrl: item.affiliateUrl || '',
                    promoCode: item.promoCode || '',
                    promoLabel: item.promoLabel || '',
                    imageUrl: publicImageUrl(item.imageUrl, cloudName),
                    qty: normalizeCopiedQuantity(ci.qty),
                    worn: ci.worn || 0,
                    consumable: ci.consumable === true,
                    star: ci.star || 0,
                };
            }).filter(Boolean),
        }));

    const ownerName = (owner.library && owner.library.publicProfile && owner.library.publicProfile.displayName) || owner.username;
    const sourceCurrencySymbol = published.currencySymbol || '$';
    const listName = publishedList.name || sourceList.name;

    return {
        listName,
        description: publishedList.description || '',
        destination: publishedList.destination || '',
        seasons: normalizeTagArray(publishedList.seasons),
        listTypes: normalizeTagArray(publishedList.listTypes),
        durations: normalizeTagArray(publishedList.durations),
        sourceCurrencySymbol,
        categories,
        forkedFrom: {
            externalId: sourceList.externalId,
            ownerId: String(owner._id),
            ownerUsername: owner.username,
            ownerName,
            listName,
            sourceCurrencySymbol,
            copiedAt: now.toISOString(),
            version: version.version,
        },
    };
}

module.exports = { canCopy, buildCopyPayload };
