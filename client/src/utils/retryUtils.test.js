/**
 * Test file for retry mechanism
 * This demonstrates how to test the retry functionality
 */

import { calculateDelay, shouldRetry, retryWithBackoff, fetchWithRetry } from './retryUtils.js';

// Mock fetch for testing
global.fetch = jest.fn();

describe('Retry Utils', () => {
    beforeEach(() => {
        fetch.mockClear();
    });

    describe('calculateDelay', () => {
        test('should calculate exponential backoff with jitter', () => {
            const delay1 = calculateDelay(0, { baseDelay: 1000 });
            const delay2 = calculateDelay(1, { baseDelay: 1000 });
            const delay3 = calculateDelay(2, { baseDelay: 1000 });

            // First attempt should be around 1000ms ± 25%
            expect(delay1).toBeGreaterThan(750);
            expect(delay1).toBeLessThan(1250);

            // Second attempt should be around 2000ms ± 25%
            expect(delay2).toBeGreaterThan(1500);
            expect(delay2).toBeLessThan(2500);

            // Third attempt should be around 4000ms ± 25%
            expect(delay3).toBeGreaterThan(3000);
            expect(delay3).toBeLessThan(5000);
        });

        test('should respect maxDelay', () => {
            const delay = calculateDelay(10, { baseDelay: 1000, maxDelay: 5000 });
            expect(delay).toBeLessThanOrEqual(5000);
        });

        test('should handle zero baseDelay', () => {
            const delay = calculateDelay(0, { baseDelay: 0 });
            expect(delay).toBeGreaterThanOrEqual(0);
        });
    });

    describe('shouldRetry', () => {
        test('should retry on 429 status', () => {
            const response = { status: 429 };
            expect(shouldRetry(response)).toBe(true);
        });

        test('should retry on custom status codes', () => {
            const response = { status: 500 };
            const options = { retryStatusCodes: [429, 500, 502] };
            expect(shouldRetry(response, options)).toBe(true);
        });

        test('should not retry on 200 status', () => {
            const response = { status: 200 };
            expect(shouldRetry(response)).toBe(false);
        });

        test('should not retry on 400 status by default', () => {
            const response = { status: 400 };
            expect(shouldRetry(response)).toBe(false);
        });
    });

    describe('retryWithBackoff', () => {
        test('should succeed on first attempt', async () => {
            const mockFn = jest.fn().mockResolvedValue('success');

            const result = await retryWithBackoff(mockFn);

            expect(result).toBe('success');
            expect(mockFn).toHaveBeenCalledTimes(1);
        });

        test('should retry and eventually succeed', async () => {
            const mockFn = jest.fn()
                .mockRejectedValueOnce(new Error('429'))
                .mockRejectedValueOnce(new Error('429'))
                .mockResolvedValue('success');

            const result = await retryWithBackoff(mockFn, { maxRetries: 3 });

            expect(result).toBe('success');
            expect(mockFn).toHaveBeenCalledTimes(3);
        });

        test('should fail after max retries', async () => {
            const mockFn = jest.fn().mockRejectedValue(new Error('429'));

            await expect(retryWithBackoff(mockFn, { maxRetries: 2 }))
                .rejects.toThrow('429');

            expect(mockFn).toHaveBeenCalledTimes(3); // Initial + 2 retries
        });

        test('should call onRetry callback', async () => {
            const mockFn = jest.fn()
                .mockRejectedValueOnce(new Error('429'))
                .mockResolvedValue('success');

            const onRetry = jest.fn();

            await retryWithBackoff(mockFn, { onRetry });

            expect(onRetry).toHaveBeenCalledWith(0, expect.any(Number), expect.any(Error));
        });

        test('should call onMaxRetriesExceeded callback', async () => {
            const mockFn = jest.fn().mockRejectedValue(new Error('429'));
            const onMaxRetriesExceeded = jest.fn();

            await expect(retryWithBackoff(mockFn, {
                maxRetries: 1,
                onMaxRetriesExceeded
            })).rejects.toThrow('429');

            expect(onMaxRetriesExceeded).toHaveBeenCalledWith(
                expect.any(Error),
                1
            );
        });
    });

    describe('fetchWithRetry', () => {
        test('should retry on 429 response', async () => {
            fetch
                .mockResolvedValueOnce({
                    ok: false,
                    status: 429,
                    statusText: 'Too Many Requests'
                })
                .mockResolvedValueOnce({
                    ok: true,
                    status: 200,
                    statusText: 'OK'
                });

            const response = await fetchWithRetry('/api/test');

            expect(response.status).toBe(200);
            expect(fetch).toHaveBeenCalledTimes(2);
        });

        test('should not retry on 200 response', async () => {
            fetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                statusText: 'OK'
            });

            const response = await fetchWithRetry('/api/test');

            expect(response.status).toBe(200);
            expect(fetch).toHaveBeenCalledTimes(1);
        });

        test('should not retry on 400 response by default', async () => {
            fetch.mockResolvedValueOnce({
                ok: false,
                status: 400,
                statusText: 'Bad Request'
            });

            await expect(fetchWithRetry('/api/test'))
                .rejects.toThrow('HTTP 400: Bad Request');

            expect(fetch).toHaveBeenCalledTimes(1);
        });

        test('should retry on custom status codes', async () => {
            fetch
                .mockResolvedValueOnce({
                    ok: false,
                    status: 500,
                    statusText: 'Internal Server Error'
                })
                .mockResolvedValueOnce({
                    ok: true,
                    status: 200,
                    statusText: 'OK'
                });

            const response = await fetchWithRetry('/api/test', {}, {
                retryStatusCodes: [429, 500]
            });

            expect(response.status).toBe(200);
            expect(fetch).toHaveBeenCalledTimes(2);
        });
    });
});

// Example of how to test the API client
describe('API Client Integration', () => {
    test('should handle authentication automatically', async () => {
        // Mock localStorage
        const mockToken = 'test-token';
        Object.defineProperty(window, 'localStorage', {
            value: {
                getItem: jest.fn().mockReturnValue(mockToken)
            },
            writable: true
        });

        fetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            statusText: 'OK'
        });

        // This would test the actual API client
        // const response = await apiClient.get('/api/test');
        // expect(fetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({
        //     headers: expect.objectContaining({
        //         'Authorization': `Bearer ${mockToken}`
        //     })
        // }));
    });
}); 