import i18n from '../i18n';

/**
 * Utility functions for managing language preferences
 */

/**
 * Get the current language preference
 * @returns {string} The current language code
 */
export const getCurrentLanguage = () => {
    return i18n.language || 'en';
};

/**
 * Set language preference and update both i18n and user profile if authenticated
 * @param {string} languageCode - The language code to set
 * @param {Object} userTable - Database handler instance (optional, for authenticated users)
 * @param {string} userId - User ID (optional, for authenticated users)
 * @param {Function} updateLanguagePreference - Function from AuthContext to update language locally
 * @returns {Promise<boolean>} Success status
 */
export const setLanguagePreference = async (languageCode, userTable = null, userId = null, updateLanguagePreference = null) => {
    try {
        // Update i18n immediately for responsive UI
        await i18n.changeLanguage(languageCode);

        // Clear the language initialization flag to allow reload mechanism to work
        localStorage.removeItem('languageInitialized');

        // Update language preference locally in AuthContext if available
        if (updateLanguagePreference) {
            updateLanguagePreference(languageCode);
        }

        // Store in user profile if authenticated
        if (userTable && userId) {
            try {
                await userTable.handleUpdate(
                    { User_ID: userId },
                    { preferred_language: languageCode },
                    false // Don't show notification for language change
                );
            } catch (error) {
                console.error('Error saving language preference to profile:', error);
                // Don't throw error - language change still works locally
            }
        }

        return true;
    } catch (error) {
        console.error('Error setting language preference:', error);
        return false;
    }
};

/**
 * Load language preference from user profile
 * @param {Object} userData - User data from database
 * @param {Array} supportedLanguages - Array of supported language codes
 * @returns {Promise<string>} The language code to use
 */
export const loadLanguageFromProfile = async (userData, supportedLanguages = ['en', 'tc', 'sc']) => {
    // console.log('loadLanguageFromProfile: userData:', userData);
    // console.log('loadLanguageFromProfile: userData.preferred_language:', userData?.preferred_language);

    if (userData?.preferred_language && supportedLanguages.includes(userData.preferred_language)) {
        // console.log('loadLanguageFromProfile: Using user preference:', userData.preferred_language);
        await i18n.changeLanguage(userData.preferred_language);
        return userData.preferred_language;
    }

    // Fallback to current i18n language (from localStorage or browser detection)
    const fallbackLanguage = i18n.language || 'en';
    // console.log('loadLanguageFromProfile: Using fallback language:', fallbackLanguage);
    return fallbackLanguage;
};

/**
 * Get language display info
 * @param {string} languageCode - The language code
 * @returns {Object} Language info object with code, name, and flag
 */
export const getLanguageInfo = (languageCode) => {
    const languages = [
        { code: 'en', name: 'English', flag: '🇬🇧' },
        { code: 'tc', name: '繁體中文', flag: '🇭🇰' },
        { code: 'sc', name: '简体中文', flag: '🇨🇳' }
    ];

    return languages.find(lang => lang.code === languageCode) || languages[0];
};

/**
 * Get all supported languages
 * @returns {Array} Array of language objects
 */
export const getSupportedLanguages = () => {
    return [
        { code: 'en', name: 'English', flag: '🇬🇧' },
        { code: 'tc', name: '繁體中文', flag: '🇭🇰' },
        { code: 'sc', name: '简体中文', flag: '🇨🇳' }
    ];
}; 