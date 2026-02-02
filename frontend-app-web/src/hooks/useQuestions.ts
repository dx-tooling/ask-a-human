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
    const hasFetchedOnce = useRef(false);

    // Full fetch with loading state (for initial load and manual refetch)
    const fetchQuestions = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const data = await getQuestions(limit);
            setQuestions(data);
            hasFetchedOnce.current = true;
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

    // Silent fetch for background polling (no loading spinner)
    const pollQuestions = useCallback(async () => {
        try {
            const data = await getQuestions(limit);
            setQuestions(data);
        } catch {
            // Silently ignore errors during background polling
            // The next poll will try again
        }
    }, [limit]);

    // Initial fetch
    useEffect(() => {
        void fetchQuestions();
    }, [fetchQuestions]);

    // Poll when empty (silently, without loading state)
    useEffect(() => {
        // Clear any existing timeout
        if (pollTimeoutRef.current !== null) {
            window.clearTimeout(pollTimeoutRef.current);
            pollTimeoutRef.current = null;
        }

        // Only poll if: already fetched once, no questions, not loading, no error, and polling is enabled
        if (hasFetchedOnce.current && questions.length === 0 && !isLoading && !error && pollWhenEmpty > 0) {
            pollTimeoutRef.current = window.setTimeout(() => {
                void pollQuestions();
            }, pollWhenEmpty);
        }

        // Cleanup on unmount
        return () => {
            if (pollTimeoutRef.current !== null) {
                window.clearTimeout(pollTimeoutRef.current);
            }
        };
    }, [questions.length, isLoading, error, pollWhenEmpty, pollQuestions]);

    return {
        questions,
        isLoading,
        error,
        refetch: fetchQuestions,
    };
}
