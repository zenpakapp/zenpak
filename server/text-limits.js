// What the public sees of a list description, and what is stored of it. The text is bounded two
// ways, so pages stay readable, Discover projections stay small, and a description cannot be
// used to push a page out of sight or to hide link spam in a wall of text:
//  - never more than one line break in a row (fifty empty lines show as one break);
//  - at most PUBLIC_DESCRIPTION_MAX_LENGTH characters.
// The editor stops typing at the same length (client/utils/linkify.js).
const PUBLIC_DESCRIPTION_MAX_LENGTH = 1000;

// Same rule as collapseLineBreaks in client/utils/linkify.js. Lines holding only spaces count
// as empty, and none is left at the start or the end.
function collapseLineBreaks(value) {
    return String(value || '')
        .replace(/\r\n?/g, '\n')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .join('\n');
}

function clipDescription(value) {
    return collapseLineBreaks(value).slice(0, PUBLIC_DESCRIPTION_MAX_LENGTH);
}

module.exports = {
    PUBLIC_DESCRIPTION_MAX_LENGTH,
    collapseLineBreaks,
    clipDescription,
};
