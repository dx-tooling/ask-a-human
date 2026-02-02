import { useCallback, useEffect, useRef, useState } from "react";
import { getQuestions } from "@/api/client";
import type { QuestionListItem } from "@/types/api";
import { ApiError } from "@/types/api";

/** Minimum poll interval (starts here) */
const MIN_POLL_INTERVAL = 2000; // 2 seconds
/** Maximum poll interval (backs off to this) */
const MAX_POLL_INTERVAL = 30000; // 30 seconds
/** Multiplier for exponential backoff */
const BACKOFF_MULTIPLIER = 1.5;

interface UseQuestionsOptions {
    /** Maximum number of questions to fetch (default: 20) */
    limit?: number;
    /** Enable polling when no questions available (default: true) */
    enablePolling?: boolean;
}

interface UseQuestionsResult {
    questions: QuestionListItem[];
    isLoading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
}

/**
 * Hook for fetching and managing the list of open questions.
 *
 * Features:
 * - Automatically polls for new questions when the list is empty
 * - Uses exponential backoff (2s → 30s) to reduce API calls over time
 * - Pauses polling when the browser tab is hidden (Visibility API)
 * - Resets to fast polling when tab becomes visible again
 *
 * @param options - Configuration options
 * @returns Questions data, loading state, error state, and refetch function
 */
export function useQuestions(options: UseQuestionsOptions = {}): UseQuestionsResult {
    const { limit = 20, enablePolling = true } = options;

    const [questions, setQuestions] = useState<QuestionListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const pollTimeoutRef = useRef<number | null>(null);
    const isMountedRef = useRef(true);
    const currentIntervalRef = useRef(MIN_POLL_INTERVAL);
    const isPollingRef = useRef(false);

    // Clear any pending poll timeout
    const clearPollTimeout = useCallback(() => {
        if (pollTimeoutRef.current !== null) {
            window.clearTimeout(pollTimeoutRef.current);
            pollTimeoutRef.current = null;
        }
    }, []);

    // Reset backoff to minimum interval
    const resetBackoff = useCallback(() => {
        currentIntervalRef.current = MIN_POLL_INTERVAL;
    }, []);

    // Full fetch with loading state (for initial load and manual refetch)
    const fetchQuestions = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const data = await getQuestions(limit);
            setQuestions(data);
            // Reset backoff when we get questions
            if (data.length > 0) {
                resetBackoff();
            }
        } catch (err) {
            if (err instanceof ApiError) {
                setError(err);
            } else if (err instanceof Error) {
                setError(err);
            } else {
                setError(new Error("An unknown error occurred"));
            }
        } finally {
            setIsLoading(false);
        }
    }, [limit, resetBackoff]);

    // Schedule next poll with exponential backoff
    const scheduleNextPoll = useCallback(() => {
        clearPollTimeout();

        // Don't poll if disabled, unmounted, or tab is hidden
        if (!enablePolling || !isMountedRef.current || document.hidden) {
            return;
        }

        const interval = currentIntervalRef.current;

        pollTimeoutRef.current = window.setTimeout(async () => {
            if (!isMountedRef.current || document.hidden) return;

            try {
                const data = await getQuestions(limit);
                if (!isMountedRef.current) return;

                setQuestions(data);

                if (data.length === 0) {
                    // Increase backoff for next poll (exponential)
                    currentIntervalRef.current = Math.min(
                        currentIntervalRef.current * BACKOFF_MULTIPLIER,
                        MAX_POLL_INTERVAL
                    );
                    // Schedule another poll
                    scheduleNextPoll();
                } else {
                    // Got questions - reset backoff
                    resetBackoff();
                }
            } catch {
                // On error, continue polling with backoff
                if (isMountedRef.current) {
                    currentIntervalRef.current = Math.min(
                        currentIntervalRef.current * BACKOFF_MULTIPLIER,
                        MAX_POLL_INTERVAL
                    );
                    scheduleNextPoll();
                }
            }
        }, interval);
    }, [limit, enablePolling, clearPollTimeout, resetBackoff]);

    // Start polling
    const startPolling = useCallback(() => {
        if (isPollingRef.current) return;
        isPollingRef.current = true;
        scheduleNextPoll();
    }, [scheduleNextPoll]);

    // Stop polling
    const stopPolling = useCallback(() => {
        isPollingRef.current = false;
        clearPollTimeout();
    }, [clearPollTimeout]);

    // Initial fetch
    useEffect(() => {
        isMountedRef.current = true;
        void fetchQuestions();

        return () => {
            isMountedRef.current = false;
            clearPollTimeout();
        };
    }, [fetchQuestions, clearPollTimeout]);

    // Immediate silent fetch (for tab visibility return)
    const fetchImmediately = useCallback(async () => {
        if (!isMountedRef.current) return;

        try {
            const data = await getQuestions(limit);
            if (!isMountedRef.current) return;

            setQuestions(data);

            // If still empty after immediate fetch, start polling
            if (data.length === 0) {
                startPolling();
            }
        } catch {
            // On error, start polling which will retry
            if (isMountedRef.current) {
                startPolling();
            }
        }
    }, [limit, startPolling]);

    // Handle visibility change - pause/resume polling
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                // Tab hidden - stop polling
                stopPolling();
            } else {
                // Tab visible - reset backoff and fetch immediately
                resetBackoff();
                if (questions.length === 0 && !isLoading && !error) {
                    // Fetch immediately when returning to tab
                    void fetchImmediately();
                }
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [questions.length, isLoading, error, stopPolling, resetBackoff, fetchImmediately]);

    // Start/stop polling based on questions state
    useEffect(() => {
        if (!isLoading && !error && questions.length === 0 && !document.hidden) {
            startPolling();
        } else {
            stopPolling();
        }
    }, [questions.length, isLoading, error, startPolling, stopPolling]);

    return {
        questions,
        isLoading,
        error,
        refetch: fetchQuestions,
    };
}
