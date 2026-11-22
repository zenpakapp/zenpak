// Which image addresses a public page may show. An address typed by a member (or fetched from a
// shop page) can point anywhere, and a public page makes every visitor's browser load it: the owner
// of that host would learn who looks at the list, and could swap the picture after a moderator has
// seen it. Only the pictures stored in ZenPak's own Cloudinary account are shown to the public.

function publicImageUrl(value, cloudName) {
    if (typeof value !== 'string' || !value || !cloudName) return '';
    let url;
    try {
        url = new URL(value);
    } catch (err) {
        return '';
    }
    if (url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com'
        || url.username || url.password) return '';
    return url.pathname.startsWith(`/${cloudName}/`) ? value : '';
}

module.exports = { publicImageUrl };
