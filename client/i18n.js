import { createI18n } from 'vue-i18n';
import en from './locales/en.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import es from './locales/es.json';

const SUPPORTED = ['en', 'fr', 'de', 'es'];
const LOCALE_KEY = 'zp-locale';

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
    messages: { en, fr, de, es },
});

export function setLocale(locale) {
    if (locale === 'auto') {
        localStorage.removeItem(LOCALE_KEY);
        const lang = (navigator.language || 'en').slice(0, 2).toLowerCase();
        i18n.global.locale = SUPPORTED.includes(lang) ? lang : 'en';
    } else if (SUPPORTED.includes(locale)) {
        localStorage.setItem(LOCALE_KEY, locale);
        i18n.global.locale = locale;
    }
}
