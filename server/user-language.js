const SUPPORTED_LANGUAGES = ['en', 'fr', 'de', 'es'];
const DEFAULT_LANGUAGE = 'en';

// "fr-FR" and " FR " are French. Anything that is not one of the app's languages is null.
function normalizeLanguage(value) {
    if (typeof value !== 'string') return null;
    const code = value.trim().slice(0, 2).toLowerCase();
    return SUPPORTED_LANGUAGES.includes(code) ? code : null;
}

module.exports = { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, normalizeLanguage };
