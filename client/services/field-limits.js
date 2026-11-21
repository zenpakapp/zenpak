// Character limits of single-field inputs. publishNote, oauthUsername and destination match the server
// (NOTE_MAX_LENGTH in server/list-versions.js, maxLength in server/oauth.js, normalizeDestination in server/text-limits.js); the Guide has its own in guide-limits.js.
// eslint-disable-next-line import/prefer-default-export
export const FIELD_LIMITS = {
    publishNote: 200, // note on a published version
    currencySymbol: 4, // list currency symbol
    oauthUsername: 20, // username chosen after an OAuth sign-up
    destination: 100, // place or route of a list (normalizeDestination in server/text-limits.js)
};
