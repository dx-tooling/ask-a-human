import { useCallback, useEffect, useState } from "react";
import { getQuestion } from "@/api/client";
import type { QuestionDetail } from "@/types/api";
import { ApiError } from "@/types/api";

interface UseQuestionResult {
    question: QuestionDetail | null;
    isLoading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
}

/**
 * Hook for fetching a single question by ID.
 *
 * @param questionId - The question ID to fetch
 * @returns Question data, loading state, error state, and refetch function
 */
export function useQuestion(questionId: string | undefined): UseQuestionResult {
    const [question, setQuestion] = useState<QuestionDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchQuestion = useCallback(async () => {
        if (!questionId) {
            setQuestion(null);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const data = await getQuestion(questionId);
            setQuestion(data);
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
    }, [questionId]);

    useEffect(() => {
        void fetchQuestion();
    }, [fetchQuestion]);

    return {
        question,
        isLoading,
        error,
        refetch: fetchQuestion,
    };
}
