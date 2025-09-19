import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';

const LanguageTest = () => {
    const { t, i18n: hookI18n } = useTranslation();
    const [debugInfo, setDebugInfo] = useState({});

    useEffect(() => {
        const updateDebugInfo = () => {
            const currentLng = hookI18n.language;
            const availableLngs = hookI18n.languages;
            const availableResources = Object.keys(hookI18n.options.resources || {});
            const supportedLngs = hookI18n.options.supportedLngs || [];
            const whitelist = hookI18n.options.whitelist || [];
            const fallbackLng = hookI18n.options.fallbackLng;

            // Test specific translations using both hook and direct i18n
            const loginTranslation = t('common.login');
            const scLogin = hookI18n.t('common.login', { lng: 'sc' });
            const tcLogin = hookI18n.t('common.login', { lng: 'tc' });
            const enLogin = hookI18n.t('common.login', { lng: 'en' });

            // Direct i18n instance tests
            const directScLogin = i18n.t('common.login', { lng: 'sc' });
            const directTcLogin = i18n.t('common.login', { lng: 'tc' });
            const directEnLogin = i18n.t('common.login', { lng: 'en' });

            // Check if resource bundles exist
            const hasScBundle = hookI18n.hasResourceBundle('sc', 'translation');
            const hasTcBundle = hookI18n.hasResourceBundle('tc', 'translation');
            const hasEnBundle = hookI18n.hasResourceBundle('en', 'translation');

            setDebugInfo({
                currentLng,
                availableLngs,
                availableResources,
                supportedLngs,
                whitelist,
                fallbackLng,
                loginTranslation,
                scLogin,
                tcLogin,
                enLogin,
                directScLogin,
                directTcLogin,
                directEnLogin,
                hasScBundle,
                hasTcBundle,
                hasEnBundle
            });
        };

        updateDebugInfo();
        const interval = setInterval(updateDebugInfo, 1000);
        return () => clearInterval(interval);
    }, [hookI18n, t]);

    const switchLanguage = (lng) => {
        hookI18n.changeLanguage(lng);
    };

    const forceRefreshLanguages = () => {
        // Force update the languages list
        hookI18n.languages = ['en', 'tc', 'sc'];

        // Manually add resource bundles again
        const enTranslations = require('../locales/en.json');
        const tcTranslations = require('../locales/tc.json');
        const scTranslations = require('../locales/sc.json');

        hookI18n.addResourceBundle('en', 'translation', enTranslations, true, true);
        hookI18n.addResourceBundle('tc', 'translation', tcTranslations, true, true);
        hookI18n.addResourceBundle('sc', 'translation', scTranslations, true, true);
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-md max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-4">{t('languageTest.title')}</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="space-y-2">
                    <p><strong>Current Language:</strong> {debugInfo.currentLng}</p>
                    <p><strong>Available Languages:</strong> {debugInfo.availableLngs?.join(', ')}</p>
                    <p><strong>Available Resources:</strong> {debugInfo.availableResources?.join(', ')}</p>
                    <p><strong>Supported Languages:</strong> {debugInfo.supportedLngs?.join(', ')}</p>
                    <p><strong>Whitelist:</strong> {debugInfo.whitelist?.join(', ')}</p>
                </div>

                <div className="space-y-2">
                    <p><strong>Fallback Language:</strong> {JSON.stringify(debugInfo.fallbackLng)}</p>
                    <p><strong>Test Translation (Hook):</strong> {debugInfo.loginTranslation}</p>
                    <p><strong>sc Login (Hook):</strong> {debugInfo.scLogin}</p>
                    <p><strong>tc Login (Hook):</strong> {debugInfo.tcLogin}</p>
                    <p><strong>en Login (Hook):</strong> {debugInfo.enLogin}</p>
                </div>
            </div>

            <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Direct i18n Instance Tests:</h3>
                <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 bg-blue-100 rounded">
                        <p><strong>Direct sc:</strong> {debugInfo.directScLogin}</p>
                    </div>
                    <div className="p-3 bg-green-100 rounded">
                        <p><strong>Direct tc:</strong> {debugInfo.directTcLogin}</p>
                    </div>
                    <div className="p-3 bg-yellow-100 rounded">
                        <p><strong>Direct en:</strong> {debugInfo.directEnLogin}</p>
                    </div>
                </div>
            </div>

            <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Resource Bundle Status:</h3>
                <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 bg-gray-100 rounded">
                        <p><strong>English:</strong> {debugInfo.hasEnBundle ? '✅' : '❌'}</p>
                    </div>
                    <div className="p-3 bg-gray-100 rounded">
                        <p><strong>Traditional Chinese:</strong> {debugInfo.hasTcBundle ? '✅' : '❌'}</p>
                    </div>
                    <div className="p-3 bg-gray-100 rounded">
                        <p><strong>Simplified Chinese:</strong> {debugInfo.hasScBundle ? '✅' : '❌'}</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
                <button
                    onClick={() => switchLanguage('en')}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    Switch to English
                </button>
                <button
                    onClick={() => switchLanguage('tc')}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                    Switch to Traditional Chinese
                </button>
                <button
                    onClick={() => switchLanguage('sc')}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                    Switch to Simplified Chinese
                </button>
                <button
                    onClick={forceRefreshLanguages}
                    className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
                >
                    Force Refresh Languages
                </button>
            </div>

            <div className="bg-gray-100 p-4 rounded">
                <h3 className="text-lg font-semibold mb-2">Translation Test:</h3>
                <p><strong>Login:</strong> {t('common.login')}</p>
                <p><strong>Register:</strong> {t('common.register')}</p>
                <p><strong>About:</strong> {t('common.about')}</p>
                <p><strong>Help:</strong> {t('common.help')}</p>
            </div>
        </div>
    );
};

export default LanguageTest; 