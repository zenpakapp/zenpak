// Character limits of single-field inputs. publishNote and oauthUsername match the server
// (NOTE_MAX_LENGTH in server/list-versions.js, maxLength in server/oauth.js); the Guide has its own in guide-limits.js.
export const FIELD_LIMITS = {
    publishNote: 200, // note on a published version
    currencySymbol: 4, // list currency symbol
    oauthUsername: 20, // username chosen after an OAuth sign-up
};
