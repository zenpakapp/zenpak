const crypto = require('crypto');
const config = require('config');

// Only an image this app stored as a profile photo is ever destroyed: the folder is checked, so a
// Google photo, a foreign address or an item image (copies made by other accounts may still show
// it) is left alone.
const AVATAR_FOLDER = 'lighterpack/avatars/';

function avatarPublicId(url, cloudName) {
    if (typeof url !== 'string' || !cloudName) return '';
    let parsed;
    try {
        parsed = new URL(url);
    } catch (e) {
        return '';
    }
    if (parsed.protocol !== 'https:' || parsed.hostname !== 'res.cloudinary.com') return '';

    const prefix = `/${cloudName}/image/upload/`;
    if (!parsed.pathname.startsWith(prefix)) return '';
    // .../upload/v1792351260/lighterpack/avatars/abc123.png  ->  lighterpack/avatars/abc123
    const rest = parsed.pathname.slice(prefix.length).replace(/^v\d+\//, '');
    const withoutExtension = rest.replace(/\.[A-Za-z0-9]+$/, '');
    if (!withoutExtension.startsWith(AVATAR_FOLDER)) return '';
    if (withoutExtension.slice(AVATAR_FOLDER.length).includes('/')) return '';
    return decodeURIComponent(withoutExtension);
}

// Removes a profile photo from the image host. Resolves with whether a request was made; rejects
// when the host refuses, so the caller can log it (a failure never blocks an account deletion).
async function destroyAvatar(url) {
    const cloudName = config.has('cloudinaryCloudName') ? config.get('cloudinaryCloudName') : '';
    const apiKey = config.has('cloudinaryApiKey') ? config.get('cloudinaryApiKey') : '';
    const apiSecret = config.has('cloudinaryApiSecret') ? config.get('cloudinaryApiSecret') : '';
    const publicId = avatarPublicId(url, cloudName);
    if (!publicId || !apiKey || !apiSecret) return false;

    const timestamp = Math.floor(Date.now() / 1000);
    const signature = crypto.createHash('sha1').update(`public_id=${publicId}&timestamp=${timestamp}${apiSecret}`).digest('hex');
    const formData = new FormData();
    formData.append('public_id', publicId);
    formData.append('api_key', apiKey);
    formData.append('timestamp', String(timestamp));
    formData.append('signature', signature);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
        method: 'POST',
        body: formData,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.error) {
        throw new Error(`Cloudinary refused to remove the image: ${(data.error && data.error.message) || response.status}`);
    }
    return true;
}

module.exports = { avatarPublicId, destroyAvatar };
