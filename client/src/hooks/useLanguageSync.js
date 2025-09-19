import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';

export const useLanguageSync = () => {
    const { i18n } = useTranslation();
    const { currentUser, isAuthenticated } = useAuth();
    const hasSyncedRef = useRef(false);
    const hasCompletedRef = useRef(false);

    useEffect(() => {
        // Don't run if already completed
        if (hasCompletedRef.current) {
            return;
        }

        // Don't run if already synced for this session
        if (hasSyncedRef.current) {
            return;
        }

        if (isAuthenticated && currentUser?.preferred_language) {
            const userLanguage = currentUser.preferred_language;
            const currentLanguage = i18n.language;

            if (currentLanguage !== userLanguage) {
                // console.log(`useLanguageSync: Syncing language from ${currentLanguage} to ${userLanguage}`);
                i18n.changeLanguage(userLanguage);

                // Mark as synced for this session
                hasSyncedRef.current = true;

                // Force a reload if the language change doesn't take effect
                setTimeout(() => {
                    if (i18n.language !== userLanguage) {
                        // console.log('useLanguageSync: Language not applied, forcing reload...');
                        window.location.reload();
                    } else {
                        // console.log('useLanguageSync: Language successfully applied');
                    }
                }, 1000);
            } else {
                // Languages already match, mark as completed
                // console.log('useLanguageSync: Languages already match, marking as completed');
                hasSyncedRef.current = true;
            }
        } else if (!isAuthenticated) {
            // Not authenticated, mark as completed
            hasCompletedRef.current = true;
        }
    }, [isAuthenticated, currentUser, i18n]);

    // Mark as completed after a reasonable time
    useEffect(() => {
        const timer = setTimeout(() => {
            hasCompletedRef.current = true;
        }, 5000); // 5 seconds timeout

        return () => clearTimeout(timer);
    }, []);

    return { isSynced: hasSyncedRef.current };
}; 