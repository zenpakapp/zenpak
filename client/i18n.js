import { createI18n } from 'vue-i18n';
import { setGenericErrorMessage } from './utils/utils';
import { SUPPORTED_LOCALES as SUPPORTED, DEFAULT_LOCALE, normalizeLocale } from '../shared/locales';

const LOCALE_KEY = 'zp-locale';
// One chunk per language, named after the file; the languages themselves are listed in shared/locales.js.
const loadLocaleFile = (code) => import(/* webpackChunkName: "locale-[request]" */ `./locales/${code}.json`);
const loadedLocales = {};

function detectLocale() {
    const saved = localStorage.getItem(LOCALE_KEY);
    if (saved && SUPPORTED.includes(saved)) return saved;
    return normalizeLocale(navigator.language) || DEFAULT_LOCALE;
}

export const i18n = createI18n({
    legacy: true,
    locale: detectLocale(),
    fallbackLocale: DEFAULT_LOCALE,
    messages: {},
});

// A failed request with nothing to say shows this sentence, in the language of the page.
function syncGenericError() {
    setGenericErrorMessage(i18n.global.t('misc.genericError'));
}

export async function loadLocale(locale) {
    const target = SUPPORTED.includes(locale) ? locale : DEFAULT_LOCALE;
    if (!loadedLocales[target]) {
        const messages = await loadLocaleFile(target);
        i18n.global.setLocaleMessage(target, messages.default || messages);
        loadedLocales[target] = true;
    }
    return target;
}

// The server writes emails and alerts for the account, so it needs to know the language of the page.
export async function syncAccountLanguage(serverLanguage) {
    const current = i18n.global.locale;
    if (serverLanguage === current) return;
    try {
        await fetch('/api/account/language', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ language: current }),
        });
    } catch {
        // silent: it is sent again the next time the app loads
    }
}

export async function setLocale(locale, loggedIn = false) {
    let target = locale;
    if (locale === 'auto') {
        localStorage.removeItem(LOCALE_KEY);
        target = normalizeLocale(navigator.language) || DEFAULT_LOCALE;
    } else if (SUPPORTED.includes(locale)) {
        localStorage.setItem(LOCALE_KEY, locale);
    } else {
        target = DEFAULT_LOCALE;
    }

    i18n.global.locale = await loadLocale(target);
    syncGenericError();
    if (loggedIn) syncAccountLanguage(null);
}

export function initLocale() {
    return loadLocale(i18n.global.locale).then((target) => {
        syncGenericError();
        return target;
    });
}
