import { createI18n } from 'vue-i18n';

const SUPPORTED = ['en', 'fr', 'de', 'es'];
const LOCALE_KEY = 'zp-locale';
const localeLoaders = {
    en: () => import(/* webpackChunkName: "locale-en" */ './locales/en.json'),
    fr: () => import(/* webpackChunkName: "locale-fr" */ './locales/fr.json'),
    de: () => import(/* webpackChunkName: "locale-de" */ './locales/de.json'),
    es: () => import(/* webpackChunkName: "locale-es" */ './locales/es.json'),
};
const loadedLocales = {};

function detectLocale() {
    const saved = localStorage.getItem(LOCALE_KEY);
    if (saved && SUPPORTED.includes(saved)) return saved;
    const lang = (navigator.language || 'en').slice(0, 2).toLowerCase();
    return SUPPORTED.includes(lang) ? lang : 'en';
}

export const i18n = createI18n({
    legacy: true,
    locale: detectLocale(),
    fallbackLocale: 'en',
    messages: {},
});

export async function loadLocale(locale) {
    const target = SUPPORTED.includes(locale) ? locale : 'en';
    if (!loadedLocales[target]) {
        const messages = await localeLoaders[target]();
        i18n.global.setLocaleMessage(target, messages.default || messages);
        loadedLocales[target] = true;
    }
    return target;
}

export async function setLocale(locale) {
    let target = locale;
    if (locale === 'auto') {
        localStorage.removeItem(LOCALE_KEY);
        const lang = (navigator.language || 'en').slice(0, 2).toLowerCase();
        target = SUPPORTED.includes(lang) ? lang : 'en';
    } else if (SUPPORTED.includes(locale)) {
        localStorage.setItem(LOCALE_KEY, locale);
    } else {
        target = 'en';
    }

    i18n.global.locale = await loadLocale(target);
}

export function initLocale() {
    return loadLocale(i18n.global.locale);
}
