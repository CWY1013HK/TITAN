import { useEffect, useRef } from 'react';
import { scrollToTop } from '../utils/scrollUtils';

/**
 * Custom hook to handle scroll reset when loading states complete
 * @param {Object} options - Configuration options
 * @param {boolean} options.isLoading - Current loading state
 * @param {boolean} options.wasLoading - Previous loading state (optional, will be tracked internally if not provided)
 * @param {string} options.behavior - Scroll behavior ('auto', 'smooth', 'instant') (default: 'auto')
 * @param {number} options.delay - Delay before scrolling in milliseconds (default: 100)
 * @param {boolean} options.enabled - Whether scroll reset is enabled (default: true)
 */
export const useLoadingScrollReset = (options = {}) => {
    const {
        isLoading,
        wasLoading: externalWasLoading,
        behavior = 'auto',
        delay = 100,
        enabled = true
    } = options;

    const wasLoadingRef = useRef(false);
    const timeoutRef = useRef(null);

    // Track loading state changes
    useEffect(() => {
        const wasLoading = externalWasLoading !== undefined ? externalWasLoading : wasLoadingRef.current;

        // If loading just completed (was loading, now not loading)
        if (wasLoading && !isLoading && enabled) {
            // Clear any existing timeout
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            // Scroll to top after delay
            timeoutRef.current = setTimeout(() => {
                scrollToTop({ behavior, delay: 0 });
            }, delay);
        }

        // Update internal tracking
        wasLoadingRef.current = isLoading;

        // Cleanup function
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [isLoading, externalWasLoading, behavior, delay, enabled]);
};

export default useLoadingScrollReset; 