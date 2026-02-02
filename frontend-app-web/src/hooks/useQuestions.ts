import { useCallback, useEffect, useState } from "react";
import { getQuestions } from "@/api/client";
import type { QuestionListItem } from "@/types/api";
import { ApiError } from "@/types/api";

interface UseQuestionsResult {
    questions: QuestionListItem[];
    isLoading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
}

/**
 * Hook for fetching and managing the list of open questions.
 *
 * @param limit - Maximum number of questions to fetch (default: 20)
 * @returns Questions data, loading state, error state, and refetch function
 */
export function useQuestions(limit = 20): UseQuestionsResult {
    const [questions, setQuestions] = useState<QuestionListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

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

    useEffect(() => {
        void fetchQuestions();
    }, [fetchQuestions]);

    return {
        questions,
        isLoading,
        error,
        refetch: fetchQuestions,
    };
}
