import { useCallback, useState } from "react";
import { submitResponse } from "@/api/client";
import type { SubmitResponseRequest, SubmitResponseResult } from "@/types/api";
import { ApiError } from "@/types/api";

interface UseSubmitResponseResult {
    submit: (data: SubmitResponseRequest) => Promise<SubmitResponseResult | null>;
    isSubmitting: boolean;
    error: Error | null;
    result: SubmitResponseResult | null;
    reset: () => void;
}

/**
 * Hook for submitting a response to a question.
 *
 * @returns Submit function, loading state, error state, result, and reset function
 */
export function useSubmitResponse(): UseSubmitResponseResult {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [result, setResult] = useState<SubmitResponseResult | null>(null);

    const submit = useCallback(async (data: SubmitResponseRequest) => {
        setIsSubmitting(true);
        setError(null);

        try {
            const response = await submitResponse(data);
            setResult(response);
            return response;
        } catch (err) {
            if (err instanceof ApiError) {
                setError(err);
            } else if (err instanceof Error) {
                setError(err);
            } else {
                setError(new Error("An unknown error occurred"));
            }
            return null;
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const reset = useCallback(() => {
        setError(null);
        setResult(null);
    }, []);

    return {
        submit,
        isSubmitting,
        error,
        result,
        reset,
    };
}
