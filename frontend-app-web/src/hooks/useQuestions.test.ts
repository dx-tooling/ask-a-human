import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useQuestions } from "./useQuestions";
import * as apiClient from "@/api/client";
import { ApiError } from "@/types/api";

// Mock the API client
vi.mock("@/api/client", () => ({
    getQuestions: vi.fn(),
}));

const mockGetQuestions = vi.mocked(apiClient.getQuestions);

const mockQuestions = [
    {
        question_id: "q-1",
        prompt: "Question 1",
        type: "text" as const,
        responses_needed: 5,
        created_at: "2024-01-01T00:00:00Z",
    },
    {
        question_id: "q-2",
        prompt: "Question 2",
        type: "multiple_choice" as const,
        responses_needed: 3,
        created_at: "2024-01-01T00:00:00Z",
        options: ["A", "B", "C"],
    },
];

describe("useQuestions", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns loading state initially", () => {
        mockGetQuestions.mockImplementation(
            () => new Promise(() => {}) // eslint-disable-line @typescript-eslint/no-empty-function
        ); // Never resolves

        const { result } = renderHook(() => useQuestions({ enablePolling: false }));

        expect(result.current.isLoading).toBe(true);
        expect(result.current.questions).toEqual([]);
        expect(result.current.error).toBeNull();
    });

    it("fetches questions successfully", async () => {
        mockGetQuestions.mockResolvedValue(mockQuestions);

        const { result } = renderHook(() => useQuestions({ enablePolling: false }));

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.questions).toEqual(mockQuestions);
        expect(result.current.error).toBeNull();
    });

    it("respects limit option", async () => {
        mockGetQuestions.mockResolvedValue(mockQuestions);

        renderHook(() => useQuestions({ limit: 10, enablePolling: false }));

        await waitFor(() => {
            expect(mockGetQuestions).toHaveBeenCalledWith(10);
        });
    });

    it("uses default limit of 20", async () => {
        mockGetQuestions.mockResolvedValue(mockQuestions);

        renderHook(() => useQuestions({ enablePolling: false }));

        await waitFor(() => {
            expect(mockGetQuestions).toHaveBeenCalledWith(20);
        });
    });

    it("handles API error", async () => {
        const apiError = new ApiError("Server error", "SERVER_ERROR", 500);
        mockGetQuestions.mockRejectedValue(apiError);

        const { result } = renderHook(() => useQuestions({ enablePolling: false }));

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.error).toBe(apiError);
        expect(result.current.questions).toEqual([]);
    });

    it("handles generic error", async () => {
        const genericError = new Error("Network failure");
        mockGetQuestions.mockRejectedValue(genericError);

        const { result } = renderHook(() => useQuestions({ enablePolling: false }));

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.error).toBe(genericError);
    });

    it("handles unknown error type", async () => {
        mockGetQuestions.mockRejectedValue("some string error");

        const { result } = renderHook(() => useQuestions({ enablePolling: false }));

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.error?.message).toBe("An unknown error occurred");
    });

    it("refetches when refetch is called", async () => {
        mockGetQuestions.mockResolvedValue(mockQuestions);

        const { result } = renderHook(() => useQuestions({ enablePolling: false }));

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(mockGetQuestions).toHaveBeenCalledTimes(1);

        // Call refetch
        await act(async () => {
            await result.current.refetch();
        });

        expect(mockGetQuestions).toHaveBeenCalledTimes(2);
    });

    it("returns empty array when no questions", async () => {
        mockGetQuestions.mockResolvedValue([]);

        const { result } = renderHook(() => useQuestions({ enablePolling: false }));

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.questions).toEqual([]);
        expect(result.current.error).toBeNull();
    });
});
