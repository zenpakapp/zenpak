// Links written by users on a public list.
//
// `rel` for every kind of link a user can put on a page. All of them tell search engines not to
// follow it (`nofollow`) so spam gains nothing; `sponsored` marks a link that may pay its
// author; `ugc` marks user-generated content.
export const SPONSORED_REL = 'nofollow sponsored noopener noreferrer';
export const UGC_REL = 'nofollow ugc noopener noreferrer';
// A URL typed in a description can be anything, so it is both.
export const USER_LINK_REL = 'nofollow sponsored ugc noopener noreferrer';

// How many URLs of a description become links. The rest stays text.
export const MAX_DESCRIPTION_LINKS = 3;

// What the editor lets an author type, and what the public sees (server/text-limits.js).
export const MAX_DESCRIPTION_LENGTH = 1000;

// An address typed without "https://" is still a link, but only when it is clearly one:
// "www." or a known ending followed by a path ("instagram.com/name"). A bare "example.com", a
// file name ("tent.png") or an e-mail address stays text. Not glued to a word on its left.
const KNOWN_ENDINGS = 'com|org|net|io|co|app|dev|fr|de|es|it|nl|be|ch|uk|eu|ca|us|info|me|tv|ly|gg|cc|xyz|ai';
const NOT_GLUED = '(?<![\\w./-])(?<!\\w@)';
const REST_OF_URL = '[^\\s<>"\']';
// A description keeps its line breaks, but never more than one in a row: fifty empty lines
// would otherwise push the rest of the page out of sight. Lines holding only spaces count as
// empty, and none is left at the start or the end. Same rule as server/text-limits.js.
export function collapseLineBreaks(text) {
    if (typeof text !== 'string') return '';
    return text
        .replace(/\r\n?/g, '\n')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .join('\n');
}

const URL_PATTERN = new RegExp([
    `https?:\\/\\/${REST_OF_URL}+`,
    `${NOT_GLUED}www\\.(?:[a-z0-9-]+\\.)+[a-z]{2,}(?:\\/${REST_OF_URL}*)?`,
    `${NOT_GLUED}(?:[a-z0-9-]+\\.)+(?:${KNOWN_ENDINGS})\\/${REST_OF_URL}+`,
].join('|'), 'gi');

const countOf = (text, character) => text.split(character).length - 1;

// Punctuation that ends a sentence, or a bracket that closes one opened outside the URL, is not
// part of the URL; a bracket balanced inside it (a Wikipedia address) is.
function shouldTrim(url) {
    const last = url.slice(-1);
    if (/[.,;:!?'"\]}]/.test(last)) return true;
    return last === ')' && countOf(url, '(') < countOf(url, ')');
}

function trimUrl(raw) {
    let url = raw;
    while (url && shouldTrim(url)) url = url.slice(0, -1);
    return url;
}

function isHttpUrl(value) {
    try {
        const url = new URL(value);
        return (url.protocol === 'http:' || url.protocol === 'https:') && Boolean(url.hostname);
    } catch (error) {
        return false;
    }
}

// Where a link goes: an address typed without a scheme goes to https.
const hrefOf = (url) => (/^https?:\/\//i.test(url) ? url : `https://${url}`);

// Cuts a text into `{ type: 'text' | 'link', value }` pieces that rebuild it, a link also
// carrying its `href`. The template renders each piece as text or as an anchor, so the text is
// never interpreted as HTML.
export function splitLinks(text, maxLinks = MAX_DESCRIPTION_LINKS) {
    const source = typeof text === 'string' ? text : '';
    if (!source) return [];

    const segments = [];
    let position = 0;
    let linkCount = 0;
    [...source.matchAll(URL_PATTERN)].forEach((match) => {
        if (linkCount >= maxLinks) return;
        const url = trimUrl(match[0]);
        if (!isHttpUrl(hrefOf(url))) return;
        if (match.index > position) {
            segments.push({ type: 'text', value: source.slice(position, match.index) });
        }
        segments.push({ type: 'link', value: url, href: hrefOf(url) });
        linkCount += 1;
        position = match.index + url.length;
    });
    if (position < source.length) {
        segments.push({ type: 'text', value: source.slice(position) });
    }
    return segments;
}
