import { useCallback, useEffect, useRef, useState } from "react";
import { getQuestions } from "@/api/client";
import type { QuestionListItem } from "@/types/api";
import { ApiError } from "@/types/api";

interface UseQuestionsOptions {
    /** Maximum number of questions to fetch (default: 20) */
    limit?: number;
    /** Poll interval in ms when no questions available (default: 2000). Set to 0 to disable. */
    pollWhenEmpty?: number;
}

interface UseQuestionsResult {
    questions: QuestionListItem[];
    isLoading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
}

/**
 * Hook for fetching and managing the list of open questions.
 * Automatically polls for new questions when the list is empty.
 *
 * @param options - Configuration options
 * @returns Questions data, loading state, error state, and refetch function
 */
export function useQuestions(options: UseQuestionsOptions = {}): UseQuestionsResult {
    const { limit = 20, pollWhenEmpty = 2000 } = options;

    const [questions, setQuestions] = useState<QuestionListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const pollTimeoutRef = useRef<number | null>(null);
    const isMountedRef = useRef(true);

    // Full fetch with loading state (for initial load and manual refetch)
    const fetchQuestions = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const data = await getQuestions(limit);
            setQuestions(data);
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
    }, [limit]);

    // Schedule next poll (self-rescheduling)
    const scheduleNextPoll = useCallback(() => {
        if (pollTimeoutRef.current !== null) {
            window.clearTimeout(pollTimeoutRef.current);
        }

        if (pollWhenEmpty > 0 && isMountedRef.current) {
            pollTimeoutRef.current = window.setTimeout(async () => {
                if (!isMountedRef.current) return;

                try {
                    const data = await getQuestions(limit);
                    if (!isMountedRef.current) return;

                    setQuestions(data);

                    // If still empty, schedule another poll
                    if (data.length === 0) {
                        scheduleNextPoll();
                    }
                } catch {
                    // On error, try again
                    if (isMountedRef.current) {
                        scheduleNextPoll();
                    }
                }
            }, pollWhenEmpty);
        }
    }, [limit, pollWhenEmpty]);

    // Initial fetch
    useEffect(() => {
        isMountedRef.current = true;
        void fetchQuestions();

        return () => {
            isMountedRef.current = false;
            if (pollTimeoutRef.current !== null) {
                window.clearTimeout(pollTimeoutRef.current);
            }
        };
    }, [fetchQuestions]);

    // Start/stop polling based on questions state
    useEffect(() => {
        if (!isLoading && !error && questions.length === 0) {
            // Start polling when empty
            scheduleNextPoll();
        } else {
            // Stop polling when we have questions or there's an error
            if (pollTimeoutRef.current !== null) {
                window.clearTimeout(pollTimeoutRef.current);
                pollTimeoutRef.current = null;
            }
        }
    }, [questions.length, isLoading, error, scheduleNextPoll]);

    return {
        questions,
        isLoading,
        error,
        refetch: fetchQuestions,
    };
}
