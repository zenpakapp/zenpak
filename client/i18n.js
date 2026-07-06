import { createI18n } from 'vue-i18n';
import en from './locales/en.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import es from './locales/es.json';

const SUPPORTED = ['en', 'fr', 'de', 'es'];

function detectLocale() {
    const lang = (navigator.language || 'en').slice(0, 2).toLowerCase();
    return SUPPORTED.includes(lang) ? lang : 'en';
}

export const i18n = createI18n({
    legacy: true,
    locale: detectLocale(),
    fallbackLocale: 'en',
    messages: { en, fr, de, es },
});
