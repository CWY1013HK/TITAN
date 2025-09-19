/**
 * Centralized API client with retry logic
 * Provides a consistent interface for all API calls with built-in retry capabilities
 * Handles both programmatic API calls and browser-initiated requests
 */

import { fetchWithRetry, defaultRetryConfig } from './retryUtils.js';

/**
 * API Client class with retry capabilities
 */
class ApiClient {
    constructor(baseURL = '', defaultOptions = {}) {
        this.baseURL = baseURL;
        this.defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            },
            ...defaultOptions
        };
    }

    /**
     * Get authentication token from localStorage
     * @returns {string|null} The authentication token
     */
    getAuthToken() {
        return localStorage.getItem('token');
    }

    /**
     * Add authentication header if token exists
     * @param {Object} options - Request options
     * @returns {Object} Options with auth header if available
     */
    addAuthHeader(options = {}) {
        const token = this.getAuthToken();
        if (token) {
            return {
                ...options,
                headers: {
                    ...options.headers,
                    'Authorization': `Bearer ${token}`
                }
            };
        }
        return options;
    }

    /**
     * Make a GET request with retry logic
     * @param {string} url - Request URL
     * @param {Object} options - Request options
     * @param {Object} retryOptions - Retry configuration
     * @returns {Promise<Response>} Promise that resolves with the response
     */
    async get(url, options = {}, retryOptions = {}) {
        const fullUrl = this.baseURL + url;
        const requestOptions = this.addAuthHeader({
            ...this.defaultOptions,
            ...options,
            method: 'GET'
        });

        const response = await fetchWithRetry(fullUrl, requestOptions, {
            ...defaultRetryConfig,
            ...retryOptions
        });

        return response;
    }

    /**
     * Handle browser-initiated GET requests (e.g., direct URL navigation, form submissions)
     * This method is designed to work with browser-initiated requests that may not have
     * the same retry context as programmatic API calls
     * @param {string} url - Request URL
     * @param {Object} options - Request options
     * @param {Object} retryOptions - Retry configuration
     * @returns {Promise<Response>} Promise that resolves with the response
     */
    async browserGet(url, options = {}, retryOptions = {}) {
        const fullUrl = this.baseURL + url;
        const requestOptions = this.addAuthHeader({
            ...this.defaultOptions,
            ...options,
            method: 'GET'
        });

        // For browser-initiated requests, use more conservative retry settings
        const browserRetryOptions = {
            ...defaultRetryConfig,
            maxRetries: 2, // Fewer retries for browser requests
            baseDelay: 2000, // Longer base delay
            maxDelay: 10000, // Shorter max delay
            ...retryOptions
        };

        const response = await fetchWithRetry(fullUrl, requestOptions, browserRetryOptions);
        return response;
    }

    /**
     * Make a POST request with retry logic
     * @param {string} url - Request URL
     * @param {Object} data - Request body data
     * @param {Object} options - Request options
     * @param {Object} retryOptions - Retry configuration
     * @returns {Promise<Response>} Promise that resolves with the response
     */
    async post(url, data = null, options = {}, retryOptions = {}) {
        const fullUrl = this.baseURL + url;
        const requestOptions = this.addAuthHeader({
            ...this.defaultOptions,
            ...options,
            method: 'POST',
            ...(data && { body: JSON.stringify(data) })
        });

        const response = await fetchWithRetry(fullUrl, requestOptions, {
            ...defaultRetryConfig,
            ...retryOptions
        });

        return response;
    }

    /**
     * Make a PUT request with retry logic
     * @param {string} url - Request URL
     * @param {Object} data - Request body data
     * @param {Object} options - Request options
     * @param {Object} retryOptions - Retry configuration
     * @returns {Promise<Response>} Promise that resolves with the response
     */
    async put(url, data = null, options = {}, retryOptions = {}) {
        const fullUrl = this.baseURL + url;
        const requestOptions = this.addAuthHeader({
            ...this.defaultOptions,
            ...options,
            method: 'PUT',
            ...(data && { body: JSON.stringify(data) })
        });

        const response = await fetchWithRetry(fullUrl, requestOptions, {
            ...defaultRetryConfig,
            ...retryOptions
        });

        return response;
    }

    /**
     * Make a PATCH request with retry logic
     * @param {string} url - Request URL
     * @param {Object} data - Request body data
     * @param {Object} options - Request options
     * @param {Object} retryOptions - Retry configuration
     * @returns {Promise<Response>} Promise that resolves with the response
     */
    async patch(url, data = null, options = {}, retryOptions = {}) {
        const fullUrl = this.baseURL + url;
        const requestOptions = this.addAuthHeader({
            ...this.defaultOptions,
            ...options,
            method: 'PATCH',
            ...(data && { body: JSON.stringify(data) })
        });

        const response = await fetchWithRetry(fullUrl, requestOptions, {
            ...defaultRetryConfig,
            ...retryOptions
        });

        return response;
    }

    /**
     * Make a DELETE request with retry logic
     * @param {string} url - Request URL
     * @param {Object} options - Request options
     * @param {Object} retryOptions - Retry configuration
     * @returns {Promise<Response>} Promise that resolves with the response
     */
    async delete(url, options = {}, retryOptions = {}) {
        const fullUrl = this.baseURL + url;
        const requestOptions = this.addAuthHeader({
            ...this.defaultOptions,
            ...options,
            method: 'DELETE'
        });

        const response = await fetchWithRetry(fullUrl, requestOptions, {
            ...defaultRetryConfig,
            ...retryOptions
        });

        return response;
    }

    /**
     * Make a request and parse JSON response
     * @param {string} method - HTTP method
     * @param {string} url - Request URL
     * @param {Object} data - Request body data
     * @param {Object} options - Request options
     * @param {Object} retryOptions - Retry configuration
     * @returns {Promise<Object>} Promise that resolves with parsed JSON data
     */
    async request(method, url, data = null, options = {}, retryOptions = {}) {
        const fullUrl = this.baseURL + url;
        const requestOptions = this.addAuthHeader({
            ...this.defaultOptions,
            ...options,
            method: method.toUpperCase(),
            ...(data && { body: JSON.stringify(data) })
        });

        const response = await fetchWithRetry(fullUrl, requestOptions, {
            ...defaultRetryConfig,
            ...retryOptions
        });

        // Try to parse JSON response
        try {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            } else {
                return await response.text();
            }
        } catch (error) {
            console.warn('Failed to parse response as JSON:', error);
            return null;
        }
    }

    /**
     * Make a request and return the raw response
     * @param {string} method - HTTP method
     * @param {string} url - Request URL
     * @param {Object} data - Request body data
     * @param {Object} options - Request options
     * @param {Object} retryOptions - Retry configuration
     * @returns {Promise<Response>} Promise that resolves with the raw response
     */
    async rawRequest(method, url, data = null, options = {}, retryOptions = {}) {
        const fullUrl = this.baseURL + url;
        const requestOptions = this.addAuthHeader({
            ...this.defaultOptions,
            ...options,
            method: method.toUpperCase(),
            ...(data && { body: JSON.stringify(data) })
        });

        return await fetchWithRetry(fullUrl, requestOptions, {
            ...defaultRetryConfig,
            ...retryOptions
        });
    }
}

// Create default API client instance
const apiClient = new ApiClient();

// Export the default instance and the class
export default apiClient;
export { ApiClient };

// Convenience functions for common API patterns
export const api = {
    get: (url, options, retryOptions) => apiClient.get(url, options, retryOptions),
    post: (url, data, options, retryOptions) => apiClient.post(url, data, options, retryOptions),
    put: (url, data, options, retryOptions) => apiClient.put(url, data, options, retryOptions),
    patch: (url, data, options, retryOptions) => apiClient.patch(url, data, options, retryOptions),
    delete: (url, options, retryOptions) => apiClient.delete(url, options, retryOptions),
    request: (method, url, data, options, retryOptions) => apiClient.request(method, url, data, options, retryOptions),
    rawRequest: (method, url, data, options, retryOptions) => apiClient.rawRequest(method, url, data, options, retryOptions)
}; 