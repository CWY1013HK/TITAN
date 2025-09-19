import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import DBTable from '../../handlers/DatabaseHandler';
import {
    getCurrentLanguage,
    setLanguagePreference,
    loadLanguageFromProfile,
    getLanguageInfo,
    getSupportedLanguages
} from '../../utils/languageUtils';

const LanguageSwitcher = () => {
    const { t, i18n } = useTranslation();
    const { currentUser, isAuthenticated, updateLanguagePreference } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [currentLanguage, setCurrentLanguage] = useState('en');
    const [isBufferActive, setIsBufferActive] = useState(false);
    const [bufferTimeout, setBufferTimeout] = useState(null);
    const hasLoadedLanguageRef = useRef(false);

    const languages = getSupportedLanguages();

    // Initialize database handler for user profile updates
    const userTable = new DBTable(
        "USER",
        "User_ID",
        {
            User_ID: "",
            First_Name: "",
            Last_Name: "",
            Nickname: "",
            Title: "",
            Gender: "",
            Email_Address: "",
            Tel: "",
            User_Role: "",
            School_Name: "",
            Form: "",
            direct_marketing: false,
            email_list: false,
            card_id: "",
            ability_6d: [1.5, 1.5, 1.5, 1.5, 1.5, 1.5],
            eddy_recommendation_title: "",
            eddy_recommendation_text: "",
            needs_recommendation_regeneration: true,
            trajectory_events: [],
            trajectory_connections: [],
            trajectory_analyses: [],
            event_types: ['academic', 'extracurricular', 'personal'],
            preferred_language: "en"
        }
    );

    useEffect(() => {
        // Force update available languages
        if (i18n.languages && i18n.languages.length < 3) {
            i18n.languages = ['en', 'tc', 'sc'];
        }

        // Load language preference from user profile if authenticated
        const loadLanguagePreference = async () => {
            if (isAuthenticated && currentUser?.User_ID) {
                // Check if we've already loaded language for this user
                if (hasLoadedLanguageRef.current === currentUser.User_ID) {
                    // We've already loaded for this user, just use current preference
                    setCurrentLanguage(currentUser.preferred_language || getCurrentLanguage());
                    return;
                }

                try {
                    // Only fetch if we don't already have the language preference
                    if (!currentUser.preferred_language) {
                        const userData = await userTable.handleRead({ User_ID: currentUser.User_ID }, false);
                        const languageCode = await loadLanguageFromProfile(userData);
                        setCurrentLanguage(languageCode);
                    } else {
                        // Use the language preference from currentUser if available
                        setCurrentLanguage(currentUser.preferred_language);
                    }

                    // Mark that we've loaded language for this user
                    hasLoadedLanguageRef.current = currentUser.User_ID;
                    return;
                } catch (error) {
                    console.error('Error loading user language preference:', error);
                }
            } else {
                // Reset the ref when user is not authenticated
                hasLoadedLanguageRef.current = false;
            }

            // Fallback to current i18n language (from localStorage or browser detection)
            setCurrentLanguage(getCurrentLanguage());
        };

        loadLanguagePreference();
    }, [i18n.language, i18n.languages, isAuthenticated, currentUser?.User_ID, currentUser?.preferred_language]);

    // Cleanup effect to clear timeout on unmount
    useEffect(() => {
        return () => {
            if (bufferTimeout) {
                clearTimeout(bufferTimeout);
            }
        };
    }, [bufferTimeout]);

    const handleLanguageChange = async (languageCode) => {
        // Prevent language change if buffer is active
        if (isBufferActive) {
            // console.log('LanguageSwitcher: Buffer active, ignoring language change request');
            return;
        }

        // Don't change if it's the same language
        if (languageCode === currentLanguage) {
            setIsOpen(false);
            return;
        }

        // Close dropdown immediately when language is selected
        setIsOpen(false);

        try {
            // console.log('LanguageSwitcher: Changing language to:', languageCode);

            // Activate buffer immediately
            setIsBufferActive(true);

            // Clear any existing timeout
            if (bufferTimeout) {
                clearTimeout(bufferTimeout);
            }

            const success = await setLanguagePreference(
                languageCode,
                isAuthenticated ? userTable : null,
                isAuthenticated ? currentUser?.User_ID : null,
                updateLanguagePreference
            );

            if (success) {
                setCurrentLanguage(languageCode);

                // Set 5-second buffer timeout
                const timeout = setTimeout(() => {
                    setIsBufferActive(false);
                    setBufferTimeout(null);
                    // console.log('LanguageSwitcher: Buffer deactivated');
                }, 5000);

                setBufferTimeout(timeout);
                // console.log('LanguageSwitcher: Buffer activated for 5 seconds');
            } else {
                // If failed, deactivate buffer immediately
                setIsBufferActive(false);
            }
        } catch (error) {
            console.error('Error changing language:', error);
            // If error, deactivate buffer immediately
            setIsBufferActive(false);
        }
    };

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (isOpen && !event.target.closest('.language-switcher')) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const getCurrentLanguageInfo = () => {
        return getLanguageInfo(currentLanguage);
    };

    return (
        <div className="relative language-switcher">
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={isBufferActive}
                className={`flex items-center space-x-4 px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 ${isBufferActive ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <span className="text-lg">{getCurrentLanguageInfo().flag}</span>
                <span className="text-sm font-medium text-gray-700">
                    {getCurrentLanguageInfo().name}
                </span>
                {isBufferActive && (
                    <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">
                        Syncing...
                    </span>
                )}
                <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-300 rounded-md shadow-lg z-50">
                    {isBufferActive && (
                        <div className="px-4 py-2 bg-orange-50 border-b border-orange-200">
                            <p className="text-xs text-orange-700">
                                {t('common.syncingWithServer')}
                            </p>
                        </div>
                    )}
                    <div className="py-1">
                        {languages.map((language) => (
                            <button
                                key={language.code}
                                onClick={() => !isBufferActive && handleLanguageChange(language.code)}
                                disabled={isBufferActive}
                                className={`w-full flex items-center space-x-3 px-4 py-2 text-sm hover:bg-gray-100 ${currentLanguage === language.code ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                                    } ${isBufferActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <span className="text-lg">{language.flag}</span>
                                <span>{language.name}</span>
                                {currentLanguage === language.code && (
                                    <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default LanguageSwitcher; 