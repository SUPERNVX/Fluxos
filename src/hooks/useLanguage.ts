import { useState, useEffect, useCallback } from 'react';
import i18n from '../i18n';

// Define available languages
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'pt-BR', name: 'Português' },
  { code: 'es', name: 'Español' },
  { code: 'ru', name: 'Русский' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
];

// Custom hook for language switching with lazy loading
export const useLanguage = () => {
  const [currentLanguage, setCurrentLanguage] = useState<string>(i18n.language);
  const [loading, setLoading] = useState(false);
  const [availableLanguages] = useState(SUPPORTED_LANGUAGES);

  const loadLanguage = useCallback(async (langCode: string) => {
    if (langCode === 'en') {
      // English is already loaded as default
      i18n.changeLanguage('en');
      setCurrentLanguage('en');
      return;
    }

    // Check if language is already loaded
    if (i18n.hasResourceBundle(langCode, 'translation')) {
      i18n.changeLanguage(langCode);
      setCurrentLanguage(langCode);
      return;
    }

    setLoading(true);

    try {
      // Dynamically import the language file
      let resources: Record<string, unknown>;
      
      switch (langCode) {
        case 'pt-BR':
          resources = (await import('../i18n/locales/pt-BR/translation.json')).default;
          break;
        case 'es':
          resources = (await import('../i18n/locales/es/translation.json')).default;
          break;
        case 'ru':
          resources = (await import('../i18n/locales/ru/translation.json')).default;
          break;
        case 'fr':
          resources = (await import('../i18n/locales/fr/translation.json')).default;
          break;
        case 'de':
          resources = (await import('../i18n/locales/de/translation.json')).default;
          break;
        default:
          resources = (await import('../i18n/locales/en/translation.json')).default;
          langCode = 'en';
          break;
      }

      // Add the translation resources to i18n
      i18n.addResourceBundle(langCode, 'translation', resources);
      
      // Change language
      i18n.changeLanguage(langCode);
      setCurrentLanguage(langCode);
    } catch (error) {
      console.error(`Failed to load language: ${langCode}`, error);
      // Fallback to English if loading fails
      i18n.changeLanguage('en');
      setCurrentLanguage('en');
    } finally {
      setLoading(false);
    }
  }, []);

  // Update current language when i18n language changes
  useEffect(() => {
    const handleLanguageChange = () => {
      setCurrentLanguage(i18n.language);
    };

    i18n.on('languageChanged', handleLanguageChange);
    
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, []);

  return {
    currentLanguage,
    loading,
    availableLanguages,
    changeLanguage: loadLanguage,
    t: i18n.t,
  };
};