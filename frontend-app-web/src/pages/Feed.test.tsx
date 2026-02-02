import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { Feed } from "./Feed";
import * as useQuestionsHook from "@/hooks/useQuestions";
import { ThemeProvider } from "@/context/ThemeContext";

// Mock the useQuestions hook
vi.mock("@/hooks/useQuestions", () => ({
    useQuestions: vi.fn(),
}));

const mockUseQuestions = vi.mocked(useQuestionsHook.useQuestions);

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

const renderFeed = () => {
    return render(
        <BrowserRouter>
            <ThemeProvider>
                <Feed />
            </ThemeProvider>
        </BrowserRouter>
    );
};

describe("Feed", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("shows loading spinner when loading", () => {
        mockUseQuestions.mockReturnValue({
            questions: [],
            isLoading: true,
            error: null,
            refetch: vi.fn(),
        });

        renderFeed();

        // Loading spinner should be present (has role="status" with sr-only text)
        expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("shows error message with retry button when error occurs", async () => {
        const mockRefetch = vi.fn();
        mockUseQuestions.mockReturnValue({
            questions: [],
            isLoading: false,
            error: new Error("Network error"),
            refetch: mockRefetch,
        });

        renderFeed();

        expect(screen.getByText("Something went wrong")).toBeInTheDocument();
        expect(screen.getByText("Network error")).toBeInTheDocument();

        // Click retry
        fireEvent.click(screen.getByRole("button", { name: "Try Again" }));

        await waitFor(() => {
            expect(mockRefetch).toHaveBeenCalled();
        });
    });

    it("shows empty state when no questions available", () => {
        mockUseQuestions.mockReturnValue({
            questions: [],
            isLoading: false,
            error: null,
            refetch: vi.fn(),
        });

        renderFeed();

        expect(screen.getByText("No questions yet")).toBeInTheDocument();
    });

    it("renders questions list when questions are available", () => {
        mockUseQuestions.mockReturnValue({
            questions: mockQuestions,
            isLoading: false,
            error: null,
            refetch: vi.fn(),
        });

        renderFeed();

        expect(screen.getByText("Question 1")).toBeInTheDocument();
        expect(screen.getByText("Question 2")).toBeInTheDocument();
        expect(screen.getByText("2 questions available")).toBeInTheDocument();
    });

    it("shows singular 'question' text for single question", () => {
        mockUseQuestions.mockReturnValue({
            questions: [mockQuestions[0]],
            isLoading: false,
            error: null,
            refetch: vi.fn(),
        });

        renderFeed();

        expect(screen.getByText("1 question available")).toBeInTheDocument();
    });

    it("renders header with app name", () => {
        mockUseQuestions.mockReturnValue({
            questions: mockQuestions,
            isLoading: false,
            error: null,
            refetch: vi.fn(),
        });

        renderFeed();

        expect(screen.getByText("Ask a Human")).toBeInTheDocument();
    });
});
