import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useQuestion } from "./useQuestion";
import * as apiClient from "@/api/client";
import { ApiError } from "@/types/api";

// Mock the API client
vi.mock("@/api/client", () => ({
    getQuestion: vi.fn(),
}));

const mockGetQuestion = vi.mocked(apiClient.getQuestion);

const mockQuestion = {
    question_id: "q-123",
    prompt: "What is the meaning of life?",
    type: "text" as const,
    responses_needed: 5,
    can_answer: true,
};

describe("useQuestion", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns loading state initially", () => {
        mockGetQuestion.mockImplementation(
            () => new Promise(() => {}) // eslint-disable-line @typescript-eslint/no-empty-function
        ); // Never resolves
        const { result } = renderHook(() => useQuestion("q-123"));

        expect(result.current.isLoading).toBe(true);
        expect(result.current.question).toBeNull();
        expect(result.current.error).toBeNull();
    });

    it("fetches question successfully", async () => {
        mockGetQuestion.mockResolvedValue(mockQuestion);

        const { result } = renderHook(() => useQuestion("q-123"));

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.question).toEqual(mockQuestion);
        expect(result.current.error).toBeNull();
        expect(mockGetQuestion).toHaveBeenCalledWith("q-123");
    });

    it("handles API error", async () => {
        const apiError = new ApiError("Not found", "NOT_FOUND", 404);
        mockGetQuestion.mockRejectedValue(apiError);

        const { result } = renderHook(() => useQuestion("q-123"));

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.question).toBeNull();
        expect(result.current.error).toBe(apiError);
    });

    it("handles generic error", async () => {
        const genericError = new Error("Network failure");
        mockGetQuestion.mockRejectedValue(genericError);

        const { result } = renderHook(() => useQuestion("q-123"));

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.error).toBe(genericError);
    });

    it("handles unknown error type", async () => {
        mockGetQuestion.mockRejectedValue("some string error");

        const { result } = renderHook(() => useQuestion("q-123"));

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.error?.message).toBe("An unknown error occurred");
    });

    it("returns null question when questionId is undefined", async () => {
        const { result } = renderHook(() => useQuestion(undefined));

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.question).toBeNull();
        expect(mockGetQuestion).not.toHaveBeenCalled();
    });

    it("refetches when refetch is called", async () => {
        mockGetQuestion.mockResolvedValue(mockQuestion);

        const { result } = renderHook(() => useQuestion("q-123"));

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(mockGetQuestion).toHaveBeenCalledTimes(1);

        // Call refetch
        await result.current.refetch();

        expect(mockGetQuestion).toHaveBeenCalledTimes(2);
    });

    it("refetches when questionId changes", async () => {
        mockGetQuestion.mockResolvedValue(mockQuestion);

        const { result, rerender } = renderHook(({ id }) => useQuestion(id), {
            initialProps: { id: "q-123" },
        });

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(mockGetQuestion).toHaveBeenCalledWith("q-123");

        // Change questionId
        rerender({ id: "q-456" });

        await waitFor(() => {
            expect(mockGetQuestion).toHaveBeenCalledWith("q-456");
        });
    });
});
