import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useSubmitResponse } from "./useSubmitResponse";
import * as apiClient from "@/api/client";
import { ApiError } from "@/types/api";

// Mock the API client
vi.mock("@/api/client", () => ({
    submitResponse: vi.fn(),
}));

const mockSubmitResponse = vi.mocked(apiClient.submitResponse);

const mockResult = {
    response_id: "r-123",
    points_earned: 10,
};

describe("useSubmitResponse", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns initial state", () => {
        const { result } = renderHook(() => useSubmitResponse());

        expect(result.current.isSubmitting).toBe(false);
        expect(result.current.error).toBeNull();
        expect(result.current.result).toBeNull();
    });

    it("submits response successfully", async () => {
        mockSubmitResponse.mockResolvedValue(mockResult);

        const { result } = renderHook(() => useSubmitResponse());

        let submitResult: typeof mockResult | null = null;
        await act(async () => {
            submitResult = await result.current.submit({
                question_id: "q-123",
                answer: "42",
            });
        });

        expect(submitResult).toEqual(mockResult);
        expect(result.current.result).toEqual(mockResult);
        expect(result.current.error).toBeNull();
        expect(result.current.isSubmitting).toBe(false);
        expect(mockSubmitResponse).toHaveBeenCalledWith({
            question_id: "q-123",
            answer: "42",
        });
    });

    it("sets isSubmitting during submission", async () => {
        let resolvePromise: ((value: typeof mockResult) => void) | undefined;
        mockSubmitResponse.mockImplementation(
            () =>
                new Promise((resolve) => {
                    resolvePromise = resolve;
                })
        );

        const { result } = renderHook(() => useSubmitResponse());

        // Start submit
        act(() => {
            void result.current.submit({ question_id: "q-123", answer: "test" });
        });

        // Should be submitting now
        expect(result.current.isSubmitting).toBe(true);

        // Resolve the promise
        act(() => {
            resolvePromise?.(mockResult);
        });

        // Should not be submitting anymore
        await waitFor(() => {
            expect(result.current.isSubmitting).toBe(false);
        });
    });

    it("handles API error", async () => {
        const apiError = new ApiError("Invalid response", "INVALID_RESPONSE", 400);
        mockSubmitResponse.mockRejectedValue(apiError);

        const { result } = renderHook(() => useSubmitResponse());

        let submitResult: typeof mockResult | null = null;
        await act(async () => {
            submitResult = await result.current.submit({
                question_id: "q-123",
                answer: "bad",
            });
        });

        expect(submitResult).toBeNull();
        expect(result.current.error).toBe(apiError);
        expect(result.current.result).toBeNull();
    });

    it("handles generic error", async () => {
        const genericError = new Error("Network failure");
        mockSubmitResponse.mockRejectedValue(genericError);

        const { result } = renderHook(() => useSubmitResponse());

        await act(async () => {
            await result.current.submit({ question_id: "q-123", answer: "test" });
        });

        expect(result.current.error).toBe(genericError);
    });

    it("handles unknown error type", async () => {
        mockSubmitResponse.mockRejectedValue("some string error");

        const { result } = renderHook(() => useSubmitResponse());

        await act(async () => {
            await result.current.submit({ question_id: "q-123", answer: "test" });
        });

        expect(result.current.error?.message).toBe("An unknown error occurred");
    });

    it("resets state when reset is called", async () => {
        mockSubmitResponse.mockResolvedValue(mockResult);

        const { result } = renderHook(() => useSubmitResponse());

        // First submit successfully
        await act(async () => {
            await result.current.submit({ question_id: "q-123", answer: "42" });
        });

        expect(result.current.result).toEqual(mockResult);

        // Reset
        act(() => {
            result.current.reset();
        });

        expect(result.current.result).toBeNull();
        expect(result.current.error).toBeNull();
    });

    it("clears previous error on new submission", async () => {
        const apiError = new ApiError("Error", "ERROR", 500);
        mockSubmitResponse.mockRejectedValueOnce(apiError);
        mockSubmitResponse.mockResolvedValueOnce(mockResult);

        const { result } = renderHook(() => useSubmitResponse());

        // First submit fails
        await act(async () => {
            await result.current.submit({ question_id: "q-123", answer: "bad" });
        });

        expect(result.current.error).toBe(apiError);

        // Second submit succeeds
        await act(async () => {
            await result.current.submit({ question_id: "q-123", answer: "good" });
        });

        expect(result.current.error).toBeNull();
        expect(result.current.result).toEqual(mockResult);
    });

    it("submits with selected_option for multiple choice", async () => {
        mockSubmitResponse.mockResolvedValue(mockResult);

        const { result } = renderHook(() => useSubmitResponse());

        await act(async () => {
            await result.current.submit({
                question_id: "q-123",
                selected_option: 2,
            });
        });

        expect(mockSubmitResponse).toHaveBeenCalledWith({
            question_id: "q-123",
            selected_option: 2,
        });
    });
});
