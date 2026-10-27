const { SUPPORTED_LOCALES, DEFAULT_LOCALE, normalizeLocale } = require('../shared/locales.js');

// The languages of the app live in shared/locales.js; these names are what the server code already uses.
module.exports = {
    SUPPORTED_LANGUAGES: SUPPORTED_LOCALES,
    DEFAULT_LANGUAGE: DEFAULT_LOCALE,
    normalizeLanguage: normalizeLocale,
};
