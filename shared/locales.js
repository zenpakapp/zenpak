// The one list of languages the app speaks. The client (language loading, picker, hreflang), the server
// (account language, emails, server messages) and the tests all read it: adding a language starts here,
// and test/unit-locale-registry.js says what is still missing. The checklist is in CODEMAP.md.
//
// `code` is two letters: browsers' "fr-FR" and the account's language are matched on their first two.
// `name` is the language written in itself, as the language picker shows it.
const LOCALES = [
    { code: 'en', name: 'English' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
    { code: 'es', name: 'Español' },
];

const DEFAULT_LOCALE = 'en';
const SUPPORTED_LOCALES = LOCALES.map((locale) => locale.code);

// "fr-FR" and " FR " are French. Anything that is not one of the app's languages is null.
function normalizeLocale(value) {
    if (typeof value !== 'string') return null;
    const code = value.trim().slice(0, 2).toLowerCase();
    return SUPPORTED_LOCALES.includes(code) ? code : null;
}

module.exports = {
    LOCALES, SUPPORTED_LOCALES, DEFAULT_LOCALE, normalizeLocale,
};
