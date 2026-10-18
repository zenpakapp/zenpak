// What the public sees of a list description. The author's saved text is never cut; only what
// is exposed (the public page, Discover cards, the search index) is. It keeps pages readable,
// the Discover projections small, and limits how much room a description gives to link spam.
// The editor stops typing at the same length (client/utils/linkify.js).
const PUBLIC_DESCRIPTION_MAX_LENGTH = 1000;

function clipDescription(value) {
    return String(value || '').slice(0, PUBLIC_DESCRIPTION_MAX_LENGTH);
}

module.exports = {
    PUBLIC_DESCRIPTION_MAX_LENGTH,
    clipDescription,
};
