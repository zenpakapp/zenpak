const { markdown } = require('markdown');

// The markdown package escapes HTML, so a description cannot add tags or attributes. It still turns
// [text](javascript:...) into a live link, and the embed page runs on other sites without our CSP.
// Browsers ignore tabs, newlines and spaces inside a scheme, so those are dropped before the check.
function isSafeAddress(address) {
    const compact = [...address].filter((character) => character.charCodeAt(0) > 32).join('');
    if (/^(https?:\/\/|mailto:)/i.test(compact)) return true;
    // No scheme at all: a relative address or an anchor.
    return !/^[^/?#]*:/.test(compact);
}

function neutralizeAddresses(html) {
    return html.replace(/\b(href|src)="([^"]*)"/g, (match, attribute, address) => (
        isSafeAddress(address) ? match : `${attribute}="#"`
    ));
}

function renderDescription(text) {
    return neutralizeAddresses(markdown.toHTML(text));
}

module.exports = { renderDescription, isSafeAddress };
