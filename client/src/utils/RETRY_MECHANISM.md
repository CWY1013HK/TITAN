# Retry Mechanism Implementation

This document explains how to use the retry mechanism with exponential backoff and random jitter for handling 429 status codes and other API failures.

## Overview

The retry mechanism consists of three main components:

1. **`retryUtils.js`** - Core retry logic with exponential backoff and random jitter
2. **`apiClient.js`** - Centralized API client with built-in retry capabilities
3. **`useRetryState.js`** - React hook for managing retry states and user feedback

## Features

- ✅ **Exponential Backoff**: Starts at 1 second, doubles each retry (1s, 2s, 4s, 8s, etc.)
- ✅ **Random Jitter**: Adds ±25% randomness to prevent thundering herd
- ✅ **429-Specific Handling**: Automatically retries on 429 (Too Many Requests) status codes
- ✅ **Configurable Limits**: Max retries, max delay, base delay, etc.
- ✅ **Proper Logging**: Tracks retry attempts for debugging
- ✅ **User Feedback**: Shows appropriate messages during retries
- ✅ **Automatic Authentication**: Handles auth tokens automatically
- ✅ **Cancellation Support**: Can cancel ongoing retries
- ✅ **Internationalization**: Multi-language support for error messages

## Quick Start

### Basic Usage

```javascript
import apiClient from '../utils/apiClient.js';

// Simple API call with retry
const response = await apiClient.post('/api/endpoint', data);
const result = await response.json();
```

### Advanced Usage with Custom Retry Options

```javascript
import apiClient from '../utils/apiClient.js';

const response = await apiClient.post('/api/endpoint', data, {}, {
    maxRetries: 3,
    baseDelay: 2000,
    maxDelay: 15000,
    onRetry: (attempt, delay, error) => {
        console.log(`Retry attempt ${attempt + 1} in ${Math.round(delay)}ms`);
    }
});
```

### React Component with User Feedback

```javascript
import React from 'react';
import { useRetryState } from '../hooks/useRetryState.js';
import apiClient from '../utils/apiClient.js';

const MyComponent = () => {
    const {
        isRetrying,
        retryCount,
        retryMessage,
        startRetry,
        handleRetrySuccess,
        handleRetryFailure,
        createRetryCallbacks
    } = useRetryState();

    const handleApiCall = async () => {
        try {
            startRetry();
            
            const retryCallbacks = createRetryCallbacks();
            const response = await apiClient.post('/api/endpoint', data, {}, retryCallbacks);
            
            const result = await response.json();
            handleRetrySuccess();
            // Handle success...
            
        } catch (error) {
            handleRetryFailure(error, retryCount);
        }
    };

    return (
        <div>
            <button onClick={handleApiCall} disabled={isRetrying}>
                {isRetrying ? 'Making API Call...' : 'Make API Call'}
            </button>
            
            {isRetrying && (
                <div className="retry-status">
                    {retryMessage}
                    {retryCount > 0 && <span> (Attempt {retryCount}/5)</span>}
                </div>
            )}
        </div>
    );
};
```

## Configuration Options

### Retry Configuration

```javascript
const retryOptions = {
    maxRetries: 5,           // Maximum number of retry attempts
    baseDelay: 1000,         // Base delay in milliseconds (1 second)
    maxDelay: 30000,         // Maximum delay in milliseconds (30 seconds)
    jitterFactor: 0.25,      // Random jitter factor (±25%)
    retryStatusCodes: [429], // Status codes to retry on
    onRetry: (attempt, delay, error) => {
        // Custom retry callback
    },
    onMaxRetriesExceeded: (error, attempts) => {
        // Custom failure callback
    }
};
```

### Default Configuration

```javascript
const defaultRetryConfig = {
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
```

## API Client Methods

### Basic HTTP Methods

```javascript
// GET request
const response = await apiClient.get('/api/endpoint');

// POST request
const response = await apiClient.post('/api/endpoint', data);

// PUT request
const response = await apiClient.put('/api/endpoint', data);

// PATCH request
const response = await apiClient.patch('/api/endpoint', data);

// DELETE request
const response = await apiClient.delete('/api/endpoint');
```

### Advanced Methods

```javascript
// Generic request method
const data = await apiClient.request('POST', '/api/endpoint', requestData, options, retryOptions);

// Raw response (without JSON parsing)
const response = await apiClient.rawRequest('POST', '/api/endpoint', requestData, options, retryOptions);
```

## Migration Guide

### From Direct Fetch Calls

**Before:**
```javascript
const response = await fetch('/api/endpoint', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
});

if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
}

const result = await response.json();
```

**After:**
```javascript
const response = await apiClient.post('/api/endpoint', data);
const result = await response.json();
```

### From Axios Calls

**Before:**
```javascript
const response = await axios.post('/api/endpoint', data, {
    headers: {
        'Authorization': `Bearer ${token}`
    }
});
```

**After:**
```javascript
const response = await apiClient.post('/api/endpoint', data);
```

## Error Handling

### Automatic Error Handling

The retry mechanism automatically handles:
- 429 (Too Many Requests) status codes
- Network errors
- Server errors (5xx)
- Authentication errors (401)

### Custom Error Handling

```javascript
try {
    const response = await apiClient.post('/api/endpoint', data);
    const result = await response.json();
    // Handle success
} catch (error) {
    if (error.status === 429) {
        // Handle rate limiting specifically
        console.log('Rate limited, will retry automatically');
    } else if (error.status >= 500) {
        // Handle server errors
        console.log('Server error, will retry automatically');
    } else {
        // Handle other errors
        console.error('Request failed:', error);
    }
}
```

## Best Practices

### 1. Use Appropriate Retry Limits

```javascript
// For critical operations (e.g., user data)
const response = await apiClient.post('/api/user/profile', data, {}, {
    maxRetries: 5,
    baseDelay: 1000
});

// For non-critical operations (e.g., analytics)
const response = await apiClient.post('/api/analytics', data, {}, {
    maxRetries: 2,
    baseDelay: 500
});
```

### 2. Provide User Feedback

```javascript
const { isRetrying, retryMessage, createRetryCallbacks } = useRetryState();

const handleApiCall = async () => {
    const retryCallbacks = createRetryCallbacks();
    
    try {
        const response = await apiClient.post('/api/endpoint', data, {}, retryCallbacks);
        // Handle success
    } catch (error) {
        // Handle final failure
    }
};
```

### 3. Handle Cancellation

```javascript
const { cancelRetry } = useRetryState();

// Cancel ongoing retry when component unmounts
useEffect(() => {
    return () => {
        cancelRetry();
    };
}, [cancelRetry]);
```

### 4. Log Retry Attempts

```javascript
const response = await apiClient.post('/api/endpoint', data, {}, {
    onRetry: (attempt, delay, error) => {
        console.log(`Retry attempt ${attempt + 1} for ${endpoint}`);
        // Log to analytics
        analytics.track('api_retry', { endpoint, attempt, delay });
    }
});
```

## Internationalization

The retry mechanism supports multiple languages through the translation system:

```json
{
    "retry": {
        "initial": "Loading...",
        "attempting": "Retrying... ({{attempt}}/{{max}})",
        "failed": "Request failed after {{max}} attempts",
        "tooManyRequests": "Too many requests. Please wait a moment and try again.",
        "serverError": "Server error. Please try again later.",
        "clientError": "Request failed. Please check your input and try again.",
        "networkError": "Network error. Please check your connection and try again.",
        "unknownError": "An unexpected error occurred.",
        "cancelled": "Request was cancelled.",
        "timeout": "Request timed out. Please try again."
    }
}
```

## Testing

### Unit Testing

```javascript
import { calculateDelay, shouldRetry } from '../utils/retryUtils.js';

describe('Retry Utils', () => {
    test('should calculate exponential backoff with jitter', () => {
        const delay = calculateDelay(1, { baseDelay: 1000 });
        expect(delay).toBeGreaterThan(1500); // 2^1 * 1000 + jitter
        expect(delay).toBeLessThan(2500);    // 2^1 * 1000 + max jitter
    });

    test('should retry on 429 status', () => {
        const response = { status: 429 };
        expect(shouldRetry(response)).toBe(true);
    });
});
```

### Integration Testing

```javascript
import apiClient from '../utils/apiClient.js';

describe('API Client', () => {
    test('should retry on 429 responses', async () => {
        // Mock fetch to return 429 then 200
        global.fetch = jest.fn()
            .mockResolvedValueOnce({ status: 429, ok: false })
            .mockResolvedValueOnce({ status: 200, ok: true, json: () => Promise.resolve({}) });

        const response = await apiClient.get('/api/test');
        expect(response.status).toBe(200);
        expect(fetch).toHaveBeenCalledTimes(2);
    });
});
```

## Troubleshooting

### Common Issues

1. **Retries not happening**: Check if the error status code is in `retryStatusCodes`
2. **Too many retries**: Adjust `maxRetries` and `maxDelay` settings
3. **User feedback not showing**: Ensure `useRetryState` is properly integrated
4. **Authentication issues**: The API client automatically handles auth tokens

### Debug Mode

Enable debug logging:

```javascript
const response = await apiClient.post('/api/endpoint', data, {}, {
    onRetry: (attempt, delay, error) => {
        console.log(`[DEBUG] Retry attempt ${attempt + 1}:`, {
            delay: Math.round(delay),
            error: error.message,
            status: error.status
        });
    }
});
```

## Performance Considerations

- **Memory Usage**: Retry state is minimal and cleaned up automatically
- **Network Impact**: Exponential backoff prevents overwhelming the server
- **User Experience**: Random jitter prevents synchronized retries
- **Battery Life**: Delays are reasonable to avoid excessive CPU usage

## Security Considerations

- **Token Handling**: Auth tokens are automatically included and refreshed
- **Error Information**: Sensitive data is not logged in retry messages
- **Rate Limiting**: Respects server rate limits and backs off appropriately
- **Cancellation**: Supports abort controllers for security-sensitive operations 