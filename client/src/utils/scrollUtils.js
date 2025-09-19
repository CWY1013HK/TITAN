/**
 * Utility functions for scroll management
 */

/**
 * Scroll to top of the page
 * @param {Object} options - Scroll options
 * @param {string} options.behavior - Scroll behavior ('auto', 'smooth', 'instant')
 * @param {number} options.delay - Delay before scrolling in milliseconds
 */
export const scrollToTop = (options = {}) => {
    const { behavior = 'auto', delay = 0 } = options;

    const scroll = () => {
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: behavior === 'instant' ? 'auto' : behavior
        });
    };

    if (delay > 0) {
        setTimeout(scroll, delay);
    } else {
        scroll();
    }
};

/**
 * Scroll to a specific element
 * @param {string|HTMLElement} element - Element selector or DOM element
 * @param {Object} options - Scroll options
 * @param {string} options.behavior - Scroll behavior
 * @param {number} options.offset - Offset from the element (default: 0)
 * @param {number} options.delay - Delay before scrolling in milliseconds
 */
export const scrollToElement = (element, options = {}) => {
    const { behavior = 'smooth', offset = 0, delay = 0 } = options;

    const scroll = () => {
        const targetElement = typeof element === 'string'
            ? document.querySelector(element)
            : element;

        if (targetElement) {
            const elementTop = targetElement.offsetTop - offset;
            window.scrollTo({
                top: elementTop,
                left: 0,
                behavior: behavior === 'instant' ? 'auto' : behavior
            });
        }
    };

    if (delay > 0) {
        setTimeout(scroll, delay);
    } else {
        scroll();
    }
};

/**
 * Check if element is in viewport
 * @param {HTMLElement} element - Element to check
 * @param {number} threshold - Threshold percentage (0-1)
 * @returns {boolean} - Whether element is in viewport
 */
export const isElementInViewport = (element, threshold = 0.1) => {
    if (!element) return false;

    const rect = element.getBoundingClientRect();
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    const windowWidth = window.innerWidth || document.documentElement.clientWidth;

    const visibleHeight = Math.min(rect.bottom, windowHeight) - Math.max(rect.top, 0);
    const visibleWidth = Math.min(rect.right, windowWidth) - Math.max(rect.left, 0);

    const visibleArea = visibleHeight * visibleWidth;
    const totalArea = rect.height * rect.width;

    return visibleArea / totalArea >= threshold;
};

/**
 * Get current scroll position
 * @returns {Object} - Scroll position {x, y}
 */
export const getScrollPosition = () => ({
    x: window.pageXOffset || document.documentElement.scrollLeft,
    y: window.pageYOffset || document.documentElement.scrollTop
});

/**
 * Save scroll position to sessionStorage
 * @param {string} key - Storage key
 */
export const saveScrollPosition = (key) => {
    const position = getScrollPosition();
    sessionStorage.setItem(key, JSON.stringify(position));
};

/**
 * Restore scroll position from sessionStorage
 * @param {string} key - Storage key
 * @param {Object} options - Restore options
 * @param {string} options.behavior - Scroll behavior
 * @param {number} options.delay - Delay before scrolling in milliseconds
 */
export const restoreScrollPosition = (key, options = {}) => {
    const { behavior = 'auto', delay = 0 } = options;

    const scroll = () => {
        const saved = sessionStorage.getItem(key);
        if (saved) {
            const position = JSON.parse(saved);
            window.scrollTo({
                top: position.y,
                left: position.x,
                behavior: behavior === 'instant' ? 'auto' : behavior
            });
        }
    };

    if (delay > 0) {
        setTimeout(scroll, delay);
    } else {
        scroll();
    }
};

export default {
    scrollToTop,
    scrollToElement,
    isElementInViewport,
    getScrollPosition,
    saveScrollPosition,
    restoreScrollPosition
}; 