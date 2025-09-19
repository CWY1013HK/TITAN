import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enTranslations from './locales/en.json';
import tcTranslations from './locales/tc.json';
import scTranslations from './locales/sc.json';

// Create resources object
const resources = {
    en: {
        translation: enTranslations
    },
    tc: {
        translation: tcTranslations
    },
    sc: {
        translation: scTranslations
    }
};

// Initialize i18n with promise
const initI18n = async () => {
    // Clear any existing instance
    if (i18n.isInitialized) {
        await i18n.destroy();
    }

    await i18n
        .use(LanguageDetector)
        .use(initReactI18next)
        .init({
            resources,
            fallbackLng: {
                'sc': ['en'], // Simplified Chinese falls back to English
                'tc': ['en'], // Traditional Chinese falls back to English
                'default': ['en']
            },
            debug: false, // Disable debug mode

            // Language detection
            detection: {
                order: ['localStorage', 'navigator'],
                caches: ['localStorage'],
                lookupLocalStorage: 'i18nextLng',
                lookupSessionStorage: 'i18nextLng',
            },

            // Interpolation
            interpolation: {
                escapeValue: false,
            },

            // Load options
            load: 'languageOnly',

            // Compatibility
            compatibilityJSON: 'v3',

            // Add supported languages explicitly
            supportedLngs: ['en', 'tc', 'sc'],

            // Add language mapping
            lng: 'en', // Default language

            // Add whitelist to ensure all languages are available
            whitelist: ['en', 'tc', 'sc'],

            // Prevent fallback to similar languages
            nonExplicitWhitelist: false,

            // Ensure language is properly initialized
            initImmediate: false,
        });

    // Force clear and reload resource bundles
    i18n.removeResourceBundle('en', 'translation');
    i18n.removeResourceBundle('tc', 'translation');
    i18n.removeResourceBundle('sc', 'translation');

    // Manually add languages after initialization
    i18n.addResourceBundle('en', 'translation', enTranslations, true, true);
    i18n.addResourceBundle('tc', 'translation', tcTranslations, true, true);
    i18n.addResourceBundle('sc', 'translation', scTranslations, true, true);

    // Force update the languages list
    i18n.languages = ['en', 'tc', 'sc'];

    // Ensure the language is properly set
    const savedLanguage = localStorage.getItem('i18nextLng');
    if (savedLanguage && ['en', 'tc', 'sc'].includes(savedLanguage)) {
        await i18n.changeLanguage(savedLanguage);
    }

    // Check if there's a user token and try to load their language preference immediately
    const token = localStorage.getItem('token');
    if (token) {
        try {
            // Try to get user data from localStorage first (if available)
            const userData = localStorage.getItem('user');
            if (userData) {
                const parsedUser = JSON.parse(userData);
                if (parsedUser.preferred_language && ['en', 'tc', 'sc'].includes(parsedUser.preferred_language)) {
                    // console.log('i18n: Found user language preference in localStorage:', parsedUser.preferred_language);
                    await i18n.changeLanguage(parsedUser.preferred_language);
                }
            }
        } catch (error) {
            console.error('i18n: Error loading user language preference:', error);
        }
    }

    return i18n;
};

// Initialize immediately
initI18n();

export default i18n; 