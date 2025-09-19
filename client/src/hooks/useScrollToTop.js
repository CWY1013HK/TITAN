import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Custom hook to handle scroll to top on route changes
 * @param {Object} options - Configuration options
 * @param {boolean} options.enabled - Whether scroll to top is enabled (default: true)
 * @param {string} options.behavior - Scroll behavior ('auto', 'smooth', 'instant') (default: 'auto')
 * @param {number} options.delay - Delay before scrolling in milliseconds (default: 0)
 * @param {string[]} options.excludePaths - Array of paths to exclude from scroll reset
 * @param {number} options.retryAttempts - Number of retry attempts if scroll fails (default: 3)
 * @param {number} options.retryDelay - Delay between retry attempts in milliseconds (default: 100)
 */
export const useScrollToTop = (options = {}) => {
    const location = useLocation();
    const {
        enabled = true,
        behavior = 'auto',
        delay = 0,
        excludePaths = [],
        retryAttempts = 3,
        retryDelay = 100
    } = options;

    const scrollAttemptsRef = useRef(0);
    const timeoutRef = useRef(null);

    useEffect(() => {
        if (!enabled) return;

        // Check if current path should be excluded
        if (excludePaths.some(path => location.pathname.startsWith(path))) {
            return;
        }

        // Clear any existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        const scrollToTop = () => {
            // Multiple scroll methods for better reliability
            const scrollMethods = [
                // Method 1: Standard window.scrollTo
                () => window.scrollTo({
                    top: 0,
                    left: 0,
                    behavior: behavior === 'instant' ? 'auto' : behavior
                }),
                // Method 2: document.documentElement.scrollTop
                () => {
                    document.documentElement.scrollTop = 0;
                    document.body.scrollTop = 0; // For Safari
                },
                // Method 3: document.body.scrollIntoView
                () => document.body.scrollIntoView({
                    behavior: behavior === 'instant' ? 'auto' : behavior,
                    block: 'start'
                }),
                // Method 4: window.scroll
                () => window.scroll(0, 0)
            ];

            const attemptScroll = (methodIndex = 0) => {
                if (methodIndex >= scrollMethods.length) {
                    // All methods failed, retry after delay
                    if (scrollAttemptsRef.current < retryAttempts) {
                        scrollAttemptsRef.current++;
                        timeoutRef.current = setTimeout(() => {
                            attemptScroll(0); // Start from first method again
                        }, retryDelay);
                    }
                    return;
                }

                try {
                    scrollMethods[methodIndex]();

                    // Verify scroll position after a short delay
                    setTimeout(() => {
                        const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;
                        if (currentScrollTop > 10) { // If still not at top
                            attemptScroll(methodIndex + 1); // Try next method
                        } else {
                            scrollAttemptsRef.current = 0; // Reset attempts on success
                        }
                    }, 50);
                } catch (error) {
                    console.warn('Scroll method failed:', error);
                    attemptScroll(methodIndex + 1); // Try next method
                }
            };

            // Reset attempts counter
            scrollAttemptsRef.current = 0;
            attemptScroll(0);
        };

        if (delay > 0) {
            timeoutRef.current = setTimeout(scrollToTop, delay);
        } else {
            // Small delay to ensure DOM is ready
            timeoutRef.current = setTimeout(scrollToTop, 10);
        }

        // Cleanup function
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [location.pathname, enabled, behavior, delay, excludePaths, retryAttempts, retryDelay]);
};

export default useScrollToTop; 