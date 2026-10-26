const crypto = require('crypto');
const config = require('config');

// Only an image this app stored is ever destroyed, and the folder is checked: a Google photo or a
// foreign address is left alone. A profile photo goes to the avatar folder, an item photo directly
// to the app folder.
const AVATAR_FOLDER = 'lighterpack/avatars/';
const ITEM_FOLDER = 'lighterpack/';

function cloudName() {
    return config.has('cloudinaryCloudName') ? config.get('cloudinaryCloudName') : '';
}

// Public id of an image stored directly under `folder` (no subfolder), or '' for anything else.
function publicIdInFolder(url, name, folder) {
    if (typeof url !== 'string' || !name) return '';
    let parsed;
    try {
        parsed = new URL(url);
    } catch (e) {
        return '';
    }
    if (parsed.protocol !== 'https:' || parsed.hostname !== 'res.cloudinary.com') return '';

    const prefix = `/${name}/image/upload/`;
    if (!parsed.pathname.startsWith(prefix)) return '';
    // .../upload/v1792351260/lighterpack/avatars/abc123.png  ->  lighterpack/avatars/abc123
    const rest = parsed.pathname.slice(prefix.length).replace(/^v\d+\//, '');
    const withoutExtension = rest.replace(/\.[A-Za-z0-9]+$/, '');
    if (!withoutExtension.startsWith(folder)) return '';
    if (withoutExtension.slice(folder.length).includes('/')) return '';
    return decodeURIComponent(withoutExtension);
}

function avatarPublicId(url, name) {
    return publicIdInFolder(url, name, AVATAR_FOLDER);
}

function itemImagePublicId(url, name) {
    return publicIdInFolder(url, name, ITEM_FOLDER);
}

// Removes an image from the host. Resolves with whether a request was made; rejects when the host
// refuses, so the caller can log it (a failure never blocks an account deletion).
async function destroyImage(publicId) {
    const apiKey = config.has('cloudinaryApiKey') ? config.get('cloudinaryApiKey') : '';
    const apiSecret = config.has('cloudinaryApiSecret') ? config.get('cloudinaryApiSecret') : '';
    if (!publicId || !apiKey || !apiSecret) return false;

    const timestamp = Math.floor(Date.now() / 1000);
    const signature = crypto.createHash('sha1').update(`public_id=${publicId}&timestamp=${timestamp}${apiSecret}`).digest('hex');
    const formData = new FormData();
    formData.append('public_id', publicId);
    formData.append('api_key', apiKey);
    formData.append('timestamp', String(timestamp));
    formData.append('signature', signature);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName()}/image/destroy`, {
        method: 'POST',
        body: formData,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.error) {
        throw new Error(`Cloudinary refused to remove the image: ${(data.error && data.error.message) || response.status}`);
    }
    return true;
}

function destroyAvatar(url) {
    return destroyImage(avatarPublicId(url, cloudName()));
}

module.exports = {
    avatarPublicId, itemImagePublicId, destroyAvatar, destroyImage, cloudName,
};
