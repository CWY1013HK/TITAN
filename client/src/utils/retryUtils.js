/**
 * Retry utility with exponential backoff and random jitter
 * Specifically designed to handle 429 (Too Many Requests) status codes
 */

/**
 * Calculate delay with exponential backoff and random jitter
 * @param {number} attempt - Current attempt number (0-based)
 * @param {Object} options - Retry configuration options
 * @returns {number} Delay in milliseconds
 */
export const calculateDelay = (attempt, options = {}) => {
    const {
        baseDelay = 1000, // 1 second base delay
        maxDelay = 30000, // 30 seconds maximum delay
        jitterFactor = 0.25 // ±25% random jitter
    } = options;

    // Exponential backoff: baseDelay * 2^attempt
    const exponentialDelay = baseDelay * Math.pow(2, attempt);

    // Cap at maxDelay
    const cappedDelay = Math.min(exponentialDelay, maxDelay);

    // Add random jitter (±jitterFactor%)
    const jitterRange = cappedDelay * jitterFactor;
    const jitter = (Math.random() - 0.5) * 2 * jitterRange;

    return Math.max(0, cappedDelay + jitter);
};

/**
 * Check if a response should trigger a retry
 * @param {Response} response - Fetch response object
 * @param {Object} options - Retry configuration options
 * @returns {boolean} Whether to retry the request
 */
export const shouldRetry = (response, options = {}) => {
    const { retryStatusCodes = [429] } = options;

    // Always retry on 429 (Too Many Requests)
    if (response.status === 429) {
        return true;
    }

    // Retry on other specified status codes
    return retryStatusCodes.includes(response.status);
};

/**
 * Retry a function with exponential backoff and random jitter
 * @param {Function} fn - Function to retry (should return a Promise)
 * @param {Object} options - Retry configuration options
 * @returns {Promise} Promise that resolves with the function result
 */
export const retryWithBackoff = async (fn, options = {}) => {
    const {
        maxRetries = 5,
        baseDelay = 1000,
        maxDelay = 30000,
        jitterFactor = 0.25,
        retryStatusCodes = [429],
        onRetry = null, // Callback function called before each retry
        onMaxRetriesExceeded = null // Callback function when max retries exceeded
    } = options;

    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const result = await fn();
            return result;
        } catch (error) {
            lastError = error;

            // Check if we should retry based on the error
            const shouldRetryRequest =
                error.status === 429 ||
                retryStatusCodes.includes(error.status) ||
                (error.response && shouldRetry(error.response, { retryStatusCodes }));

            // Don't retry if we've exceeded max retries or if it's not a retryable error
            if (attempt >= maxRetries || !shouldRetryRequest) {
                if (onMaxRetriesExceeded) {
                    onMaxRetriesExceeded(error, attempt);
                }
                throw error;
            }

            // Calculate delay for next retry
            const delay = calculateDelay(attempt, { baseDelay, maxDelay, jitterFactor });

            // Log retry attempt
            console.warn(`API request failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${Math.round(delay)}ms:`, {
                status: error.status || error.response?.status,
                message: error.message,
                url: error.url || error.config?.url
            });

            // Call onRetry callback if provided
            if (onRetry) {
                onRetry(attempt, delay, error);
            }

            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError;
};

/**
 * Create a retryable fetch function
 * @param {string} url - Request URL
 * @param {Object} options - Fetch options
 * @param {Object} retryOptions - Retry configuration options
 * @returns {Promise<Response>} Promise that resolves with the response
 */
export const fetchWithRetry = async (url, options = {}, retryOptions = {}) => {
    return retryWithBackoff(async () => {
        const response = await fetch(url, options);

        // If response is not ok and should be retried, throw an error
        if (!response.ok && shouldRetry(response, retryOptions)) {
            const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
            error.status = response.status;
            error.response = response;
            error.url = url;
            throw error;
        }

        return response;
    }, retryOptions);
};

/**
 * Default retry configuration for API requests
 */
export const defaultRetryConfig = {
    maxRetries: 5,
    baseDelay: 1000,
    maxDelay: 30000,
    jitterFactor: 0.25,
    retryStatusCodes: [429],
    onRetry: (attempt, delay, error) => {
        console.log(`Retrying API request (${attempt + 1}/5) in ${Math.round(delay)}ms`);
    },
    onMaxRetriesExceeded: (error, attempts) => {
        console.error(`Max retries exceeded (${attempts} attempts):`, error);
    }
}; 