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

    // Initial fetch
    useEffect(() => {
        void fetchQuestions();
    }, [fetchQuestions]);

    // Poll when empty
    useEffect(() => {
        // Clear any existing timeout
        if (pollTimeoutRef.current !== null) {
            window.clearTimeout(pollTimeoutRef.current);
            pollTimeoutRef.current = null;
        }

        // Only poll if: no questions, not loading, no error, and polling is enabled
        if (questions.length === 0 && !isLoading && !error && pollWhenEmpty > 0) {
            pollTimeoutRef.current = window.setTimeout(() => {
                void fetchQuestions();
            }, pollWhenEmpty);
        }

        // Cleanup on unmount
        return () => {
            if (pollTimeoutRef.current !== null) {
                window.clearTimeout(pollTimeoutRef.current);
            }
        };
    }, [questions.length, isLoading, error, pollWhenEmpty, fetchQuestions]);

    return {
        questions,
        isLoading,
        error,
        refetch: fetchQuestions,
    };
}
