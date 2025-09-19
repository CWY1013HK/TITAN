import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const GoogleForm = () => {
    const { t } = useTranslation();
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [showFallback, setShowFallback] = useState(false);

    // Disable page scrolling when component mounts
    useEffect(() => {
        const originalStyle = window.getComputedStyle(document.body).overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = originalStyle;
        };
    }, []);

    const handleIframeLoad = () => {
        setIsLoading(false);
    };

    const handleIframeError = () => {
        setIsLoading(false);
        setHasError(true);
    };

    // Show fallback option after a timeout if iframe doesn't load
    useEffect(() => {
        const timer = setTimeout(() => {
            if (isLoading) {
                setShowFallback(true);
            }
        }, 5000); // 5 seconds timeout

        return () => clearTimeout(timer);
    }, [isLoading]);

    const openInNewTab = () => {
        window.open(
            'https://docs.google.com/forms/d/e/1FAIpQLScr-icoUJBkOOD-ttagw--wm-8Zc0tvblasdTI9jjyqd4n7vA/viewform',
            '_blank',
            'noopener,noreferrer'
        );
    };

    return (
        <div className="min-h-screen">
            {isLoading && (
                <div className="flex items-center justify-center h-64 bg-gray-100">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                        <p className="text-gray-600 mb-4">{t('googleForm.loading')}</p>
                        {showFallback && (
                            <button
                                onClick={openInNewTab}
                                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                            >
                                Open form in new tab
                            </button>
                        )}
                    </div>
                </div>
            )}

            {hasError && (
                <div className="flex items-center justify-center h-64 bg-gray-100">
                    <div className="text-center">
                        <p className="text-red-600 mb-4">Failed to load the form</p>
                        <button
                            onClick={openInNewTab}
                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                        >
                            Open form in new tab
                        </button>
                    </div>
                </div>
            )}

            <iframe
                src="https://docs.google.com/forms/d/e/1FAIpQLScr-icoUJBkOOD-ttagw--wm-8Zc0tvblasdTI9jjyqd4n7vA/viewform?embedded=true"
                width="100%"
                height="calc(100vh - 64px)"
                frameBorder="0"
                marginHeight="0"
                marginWidth="0"
                title={t('googleForm.title')}
                className="border-0 w-full relative z-50"
                style={{
                    minHeight: 'calc(100vh - 64px)',
                    display: 'block',
                    opacity: isLoading ? 0 : 1,
                    transition: 'opacity 0.3s ease-in-out',
                    position: 'relative',
                    zIndex: 50
                }}
                onLoad={handleIframeLoad}
                onError={handleIframeError}
            >
                {t('googleForm.loading')}
            </iframe>
        </div>
    );
};

export default GoogleForm; 