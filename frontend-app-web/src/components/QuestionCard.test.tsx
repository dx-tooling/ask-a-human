import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { QuestionCard } from "./QuestionCard";
import type { QuestionListItem } from "@/types/api";

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
    const actual = await vi.importActual("react-router-dom");
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

const mockTextQuestion: QuestionListItem = {
    question_id: "q-123",
    prompt: "What is the best programming language?",
    type: "text",
    responses_needed: 5,
    created_at: "2024-01-01T00:00:00Z",
};

const mockMultipleChoiceQuestion: QuestionListItem = {
    question_id: "q-456",
    prompt: "Which color do you prefer?",
    type: "multiple_choice",
    responses_needed: 3,
    created_at: "2024-01-01T00:00:00Z",
    options: ["Red", "Blue", "Green"],
};

const mockQuestionWithAudience: QuestionListItem = {
    question_id: "q-789",
    prompt: "How do you like your coffee?",
    type: "text",
    responses_needed: 0,
    created_at: "2024-01-01T00:00:00Z",
    audience: "Coffee enthusiasts",
};

const renderWithRouter = (ui: React.ReactElement) => {
    return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe("QuestionCard", () => {
    beforeEach(() => {
        mockNavigate.mockClear();
    });

    it("renders question prompt", () => {
        renderWithRouter(<QuestionCard question={mockTextQuestion} />);
        expect(screen.getByText("What is the best programming language?")).toBeInTheDocument();
    });

    it("displays text badge for text questions", () => {
        renderWithRouter(<QuestionCard question={mockTextQuestion} />);
        expect(screen.getByText("Text")).toBeInTheDocument();
    });

    it("displays multiple choice badge for multiple choice questions", () => {
        renderWithRouter(<QuestionCard question={mockMultipleChoiceQuestion} />);
        expect(screen.getByText("Multiple Choice")).toBeInTheDocument();
    });

    it("displays responses needed count", () => {
        renderWithRouter(<QuestionCard question={mockTextQuestion} />);
        expect(screen.getByText("5 more needed")).toBeInTheDocument();
    });

    it("displays singular response needed", () => {
        const questionWithOne = { ...mockTextQuestion, responses_needed: 1 };
        renderWithRouter(<QuestionCard question={questionWithOne} />);
        expect(screen.getByText("1 more needed")).toBeInTheDocument();
    });

    it("displays 'Almost done' when no responses needed", () => {
        renderWithRouter(<QuestionCard question={mockQuestionWithAudience} />);
        expect(screen.getByText("Almost done")).toBeInTheDocument();
    });

    it("displays audience when provided", () => {
        renderWithRouter(<QuestionCard question={mockQuestionWithAudience} />);
        expect(screen.getByText("Looking for: Coffee enthusiasts")).toBeInTheDocument();
    });

    it("does not display audience when not provided", () => {
        renderWithRouter(<QuestionCard question={mockTextQuestion} />);
        expect(screen.queryByText(/Looking for:/)).not.toBeInTheDocument();
    });

    it("truncates long prompts", () => {
        const longPrompt = "A".repeat(200);
        const questionWithLongPrompt = { ...mockTextQuestion, prompt: longPrompt };
        renderWithRouter(<QuestionCard question={questionWithLongPrompt} />);

        // Should be truncated to 150 chars + "..."
        const truncatedText = screen.getByText(/^A+\.\.\.$/);
        expect(truncatedText.textContent).toHaveLength(153); // 150 + "..."
    });

    it("does not truncate short prompts", () => {
        renderWithRouter(<QuestionCard question={mockTextQuestion} />);
        const promptText = screen.getByText("What is the best programming language?");
        expect(promptText.textContent).not.toContain("...");
    });

    it("navigates to question detail on click", () => {
        renderWithRouter(<QuestionCard question={mockTextQuestion} />);
        const card = screen.getByRole("article");
        fireEvent.click(card);
        expect(mockNavigate).toHaveBeenCalledWith("/questions/q-123");
    });
});
