import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRetryState } from '../../hooks/useRetryState.js';
import apiClient from '../../utils/apiClient.js';

/**
 * Example component demonstrating retry mechanism with user feedback
 * This shows how to implement retry logic with proper state management
 */
const RetryExample = () => {
    const { t } = useTranslation();
    const [data, setData] = useState(null);
    const [inputValue, setInputValue] = useState('');

    // Initialize retry state
    const {
        isRetrying,
        retryCount,
        lastError,
        retryMessage,
        startRetry,
        handleRetrySuccess,
        handleRetryFailure,
        cancelRetry,
        resetRetryState,
        createRetryCallbacks
    } = useRetryState({
        maxRetries: 5,
        showUserFeedback: true
    });

    /**
     * Example API call with retry logic
     */
    const handleApiCall = async () => {
        if (!inputValue.trim()) {
            alert('Please enter some text');
            return;
        }

        try {
            startRetry();

            // Create retry callbacks
            const retryCallbacks = createRetryCallbacks();

            // Make API call with retry logic
            const response = await apiClient.post('/api/chatbot/generate', {
                text: inputValue
            }, {}, {
                ...retryCallbacks,
                maxRetries: 3, // Override default for this specific call
                baseDelay: 2000, // Start with 2 seconds for this call
                onRetry: (attempt, delay, error) => {
                    console.log(`Retry attempt ${attempt + 1} for chatbot API`);
                    retryCallbacks.onRetry(attempt, delay, error);
                }
            });

            const result = await response.json();
            setData(result);
            handleRetrySuccess();

        } catch (error) {
            handleRetryFailure(error, retryCount);
            console.error('API call failed:', error);
        }
    };

    /**
     * Example of a more complex API call with custom retry logic
     */
    const handleComplexApiCall = async () => {
        try {
            startRetry();

            // Simulate a complex API call that might fail
            const response = await apiClient.request('POST', '/api/chatbot/generate', {
                text: inputValue,
                language: 'en',
                detailed: true
            }, {}, {
                maxRetries: 2,
                baseDelay: 1000,
                onRetry: (attempt, delay, error) => {
                    console.log(`Complex API retry attempt ${attempt + 1}`);
                },
                onMaxRetriesExceeded: (error, attempts) => {
                    console.error(`Complex API failed after ${attempts} attempts:`, error);
                    handleRetryFailure(error, attempts);
                }
            });

            setData(response);
            handleRetrySuccess();

        } catch (error) {
            handleRetryFailure(error, retryCount);
        }
    };

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-4">Retry Mechanism Example</h2>

            {/* Input Section */}
            <div className="mb-6">
                <label className="block text-sm font-medium mb-2">
                    Enter text for API call:
                </label>
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded"
                    placeholder="Enter some text..."
                />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 mb-6">
                <button
                    onClick={handleApiCall}
                    disabled={isRetrying}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                    {isRetrying ? 'Making API Call...' : 'Test API Call'}
                </button>

                <button
                    onClick={handleComplexApiCall}
                    disabled={isRetrying}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                >
                    {isRetrying ? 'Making Complex API Call...' : 'Test Complex API Call'}
                </button>

                <button
                    onClick={cancelRetry}
                    disabled={!isRetrying}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                >
                    Cancel Retry
                </button>

                <button
                    onClick={resetRetryState}
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                    Reset State
                </button>
            </div>

            {/* Retry Status */}
            {isRetrying && (
                <div className="mb-4 p-4 bg-yellow-100 border border-yellow-400 rounded">
                    <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mr-2"></div>
                        <span className="text-yellow-800">{retryMessage}</span>
                    </div>
                    {retryCount > 0 && (
                        <div className="mt-2 text-sm text-yellow-700">
                            Retry attempt: {retryCount}/5
                        </div>
                    )}
                </div>
            )}

            {/* Error Display */}
            {lastError && (
                <div className="mb-4 p-4 bg-red-100 border border-red-400 rounded">
                    <h3 className="font-semibold text-red-800 mb-2">Error:</h3>
                    <p className="text-red-700">{lastError.message}</p>
                    {lastError.status && (
                        <p className="text-sm text-red-600 mt-1">
                            Status: {lastError.status}
                        </p>
                    )}
                </div>
            )}

            {/* Success Display */}
            {data && !isRetrying && !lastError && (
                <div className="mb-4 p-4 bg-green-100 border border-green-400 rounded">
                    <h3 className="font-semibold text-green-800 mb-2">Success!</h3>
                    <pre className="text-sm text-green-700 overflow-auto">
                        {JSON.stringify(data, null, 2)}
                    </pre>
                </div>
            )}

            {/* Retry Configuration Info */}
            <div className="mt-6 p-4 bg-gray-100 rounded">
                <h3 className="font-semibold mb-2">Retry Configuration:</h3>
                <ul className="text-sm space-y-1">
                    <li>• Exponential backoff starting at 1 second</li>
                    <li>• Random jitter of ±25%</li>
                    <li>• Maximum delay of 30 seconds</li>
                    <li>• Retries on 429 (Too Many Requests) status codes</li>
                    <li>• Automatic authentication token handling</li>
                    <li>• User-friendly error messages</li>
                </ul>
            </div>
        </div>
    );
};

export default RetryExample; 