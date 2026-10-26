const db = require('./db.js');
const { itemImagePublicId, destroyImage, cloudName } = require('./avatar-storage.js');

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Copies made by other accounts keep the address of the original photo, in their library and in the
// versions they published. A photo any of them still shows is not ours to destroy.
async function isShownElsewhere(publicId, ownerId) {
    const pattern = new RegExp(`/${escapeRegex(publicId)}(\\.[A-Za-z0-9]+)?$`);
    const inLibrary = await db.users.findOne({
        _id: { $ne: ownerId },
        'library.items': { $elemMatch: { imageUrl: pattern } },
    });
    if (inLibrary) return true;
    const inVersion = await db.listVersions.findOne({
        ownerId: { $ne: ownerId },
        'library.items': { $elemMatch: { imageUrl: pattern } },
    });
    return Boolean(inVersion);
}

// Destroys the item photos of a deleted account that no other account shows. Resolves with the
// number destroyed; one failing photo does not stop the others.
async function eraseUnsharedItemImages(user, onError = () => {}) {
    const items = (user && user.library && Array.isArray(user.library.items)) ? user.library.items : [];
    const name = cloudName();
    const publicIds = [...new Set(items.map((item) => itemImagePublicId(item && item.imageUrl, name)).filter(Boolean))];

    let destroyed = 0;
    // One photo at a time: the host and the database are not hammered by a large library.
    /* eslint-disable no-restricted-syntax, no-await-in-loop */
    for (const publicId of publicIds) {
        try {
            if (!await isShownElsewhere(publicId, user._id)) {
                if (await destroyImage(publicId)) destroyed += 1;
            }
        } catch (err) {
            onError(err);
        }
    }
    /* eslint-enable no-restricted-syntax, no-await-in-loop */
    return destroyed;
}

module.exports = { eraseUnsharedItemImages };
