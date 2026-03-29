/**
 * SSE Hook - Real-time progress updates via Server-Sent Events
 */

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for SSE connection to job progress endpoint
 * @param {string} jobId - Job ID to subscribe to
 * @returns {Object} SSE state and controls
 */
export function useSSE(jobId) {
    const [isConnected, setIsConnected] = useState(false);
    const [progress, setProgress] = useState(null);
    const [error, setError] = useState(null);
    const [isComplete, setIsComplete] = useState(false);
    const [zipPath, setZipPath] = useState(null);

    const eventSourceRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const reconnectAttempts = useRef(0);
    const maxReconnectAttempts = 5;

    const connect = useCallback(() => {
        if (!jobId) return;

        // Close existing connection
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        const eventSource = new EventSource(`/api/progress/${jobId}`);
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
            setIsConnected(true);
            setError(null);
            reconnectAttempts.current = 0;
        };

        eventSource.onerror = () => {
            setIsConnected(false);
            eventSource.close();

            // Attempt reconnection
            if (reconnectAttempts.current < maxReconnectAttempts && !isComplete) {
                reconnectAttempts.current++;
                const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
                reconnectTimeoutRef.current = setTimeout(() => {
                    connect();
                }, delay);
            } else if (reconnectAttempts.current >= maxReconnectAttempts) {
                setError('Connection lost. Please refresh the page.');
            }
        };

        // Handle different event types
        eventSource.addEventListener('connected', (e) => {
            const data = JSON.parse(e.data);
            console.log('SSE connected:', data);
        });

        eventSource.addEventListener('state', (e) => {
            const data = JSON.parse(e.data);
            setProgress(data);
        });

        eventSource.addEventListener('progress', (e) => {
            const data = JSON.parse(e.data);
            setProgress(data);
        });

        eventSource.addEventListener('video-progress', (e) => {
            const data = JSON.parse(e.data);
            setProgress(prev => ({
                ...prev,
                currentVideoIndex: data.videoIndex,
                currentVideoTitle: data.videoTitle,
                currentVideoProgress: data.progress
            }));
        });

        eventSource.addEventListener('complete', (e) => {
            const data = JSON.parse(e.data);
            setIsComplete(true);
            setZipPath(data.zipPath);
            setProgress(prev => ({
                ...prev,
                status: 'completed',
                overallProgress: 100
            }));
            eventSource.close();
        });

        eventSource.addEventListener('error', (e) => {
            const data = JSON.parse(e.data);
            setError(data.error);
            setProgress(prev => ({
                ...prev,
                status: 'failed'
            }));
            eventSource.close();
        });

        eventSource.addEventListener('cancelled', () => {
            setProgress(prev => ({
                ...prev,
                status: 'cancelled'
            }));
            eventSource.close();
        });

        eventSource.addEventListener('heartbeat', () => {
            // Keep-alive, no action needed
        });

    }, [jobId, isComplete]);

    // Connect when jobId changes
    useEffect(() => {
        if (jobId) {
            connect();
        }

        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, [jobId, connect]);

    const disconnect = useCallback(() => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }
        setIsConnected(false);
    }, []);

    const reset = useCallback(() => {
        disconnect();
        setProgress(null);
        setError(null);
        setIsComplete(false);
        setZipPath(null);
    }, [disconnect]);

    return {
        isConnected,
        progress,
        error,
        isComplete,
        zipPath,
        disconnect,
        reset
    };
}
