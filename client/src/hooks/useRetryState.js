import { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * React hook for managing retry states and user feedback
 * Provides loading states, retry counts, and user-friendly messages
 */
export const useRetryState = (options = {}) => {
    const { t } = useTranslation();
    const {
        maxRetries = 5,
        showUserFeedback = true,
        customMessages = {}
    } = options;

    const [isRetrying, setIsRetrying] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [lastError, setLastError] = useState(null);
    const [retryMessage, setRetryMessage] = useState('');
    const abortControllerRef = useRef(null);

    /**
     * Get user-friendly retry message
     * @param {number} attempt - Current attempt number
     * @param {number} maxRetries - Maximum retry attempts
     * @param {string} customMessage - Custom message override
     * @returns {string} User-friendly message
     */
    const getRetryMessage = useCallback((attempt, maxRetries, customMessage = '') => {
        if (customMessage) return customMessage;

        if (attempt === 0) {
            return t('retry.initial', 'Loading...');
        } else if (attempt <= maxRetries) {
            return t('retry.attempting', 'Retrying... ({{attempt}}/{{max}})', {
                attempt: attempt + 1,
                max: maxRetries + 1
            });
        } else {
            return t('retry.failed', 'Request failed after {{max}} attempts', {
                max: maxRetries + 1
            });
        }
    }, [t, maxRetries]);

    /**
     * Get error message for different error types
     * @param {Error} error - The error object
     * @returns {string} User-friendly error message
     */
    const getErrorMessage = useCallback((error) => {
        if (error.status === 429) {
            return t('retry.tooManyRequests', 'Too many requests. Please wait a moment and try again.');
        } else if (error.status >= 500) {
            return t('retry.serverError', 'Server error. Please try again later.');
        } else if (error.status >= 400) {
            return t('retry.clientError', 'Request failed. Please check your input and try again.');
        } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
            return t('retry.networkError', 'Network error. Please check your connection and try again.');
        } else {
            return error.message || t('retry.unknownError', 'An unexpected error occurred.');
        }
    }, [t]);

    /**
     * Start retry process
     */
    const startRetry = useCallback(() => {
        setIsRetrying(true);
        setRetryCount(0);
        setLastError(null);
        setRetryMessage(getRetryMessage(0, maxRetries));

        // Create abort controller for cancellation
        abortControllerRef.current = new AbortController();
    }, [maxRetries, getRetryMessage]);

    /**
     * Update retry attempt
     * @param {number} attempt - Current attempt number
     * @param {number} delay - Delay before next retry
     */
    const updateRetryAttempt = useCallback((attempt, delay) => {
        setRetryCount(attempt + 1);
        setRetryMessage(getRetryMessage(attempt + 1, maxRetries));

        if (showUserFeedback) {
            console.log(`Retry attempt ${attempt + 1}/${maxRetries + 1} in ${Math.round(delay)}ms`);
        }
    }, [maxRetries, getRetryMessage, showUserFeedback]);

    /**
     * Handle retry success
     */
    const handleRetrySuccess = useCallback(() => {
        setIsRetrying(false);
        setRetryCount(0);
        setLastError(null);
        setRetryMessage('');
    }, []);

    /**
     * Handle retry failure
     * @param {Error} error - The error that caused the failure
     * @param {number} attempts - Number of attempts made
     */
    const handleRetryFailure = useCallback((error, attempts) => {
        setIsRetrying(false);
        setLastError(error);
        setRetryMessage(getErrorMessage(error));

        if (showUserFeedback) {
            console.error(`Request failed after ${attempts} attempts:`, error);
        }
    }, [getErrorMessage, showUserFeedback]);

    /**
     * Cancel ongoing retry
     */
    const cancelRetry = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        setIsRetrying(false);
        setRetryCount(0);
        setLastError(null);
        setRetryMessage('');
    }, []);

    /**
     * Reset retry state
     */
    const resetRetryState = useCallback(() => {
        setIsRetrying(false);
        setRetryCount(0);
        setLastError(null);
        setRetryMessage('');
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
    }, []);

    /**
     * Create retry callbacks for use with retryUtils
     */
    const createRetryCallbacks = useCallback(() => ({
        onRetry: (attempt, delay, error) => {
            updateRetryAttempt(attempt, delay);
        },
        onMaxRetriesExceeded: (error, attempts) => {
            handleRetryFailure(error, attempts);
        }
    }), [updateRetryAttempt, handleRetryFailure]);

    return {
        // State
        isRetrying,
        retryCount,
        lastError,
        retryMessage,

        // Actions
        startRetry,
        updateRetryAttempt,
        handleRetrySuccess,
        handleRetryFailure,
        cancelRetry,
        resetRetryState,

        // Utilities
        createRetryCallbacks,
        getRetryMessage,
        getErrorMessage,

        // Abort controller for cancellation
        abortController: abortControllerRef.current
    };
}; 