import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Default English translation
import enTranslation from './locales/en/translation.json';

// Initialize i18n with default language
// English will be loaded initially, other languages will be loaded dynamically
i18n
  .use(initReactI18next)
  .init({
    lng: 'en', // Default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // React already escapes
    },
    resources: {
      en: {
        translation: enTranslation
      }
    }
  });

export default i18n;