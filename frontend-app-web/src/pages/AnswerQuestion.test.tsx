import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AnswerQuestion } from "./AnswerQuestion";
import { ThemeProvider } from "@/context/ThemeContext";
import * as useQuestionHook from "@/hooks/useQuestion";
import * as useSubmitResponseHook from "@/hooks/useSubmitResponse";

// Mock navigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
    const actual = await vi.importActual("react-router-dom");
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

// Mock the hooks
vi.mock("@/hooks/useQuestion", () => ({
    useQuestion: vi.fn(),
}));

vi.mock("@/hooks/useSubmitResponse", () => ({
    useSubmitResponse: vi.fn(),
}));

const mockUseQuestion = vi.mocked(useQuestionHook.useQuestion);
const mockUseSubmitResponse = vi.mocked(useSubmitResponseHook.useSubmitResponse);

const mockTextQuestion = {
    question_id: "q-123",
    prompt: "What is the best programming language?",
    type: "text" as const,
    responses_needed: 5,
    can_answer: true,
};

const mockMultipleChoiceQuestion = {
    question_id: "q-456",
    prompt: "Which color do you prefer?",
    type: "multiple_choice" as const,
    responses_needed: 3,
    can_answer: true,
    options: ["Red", "Blue", "Green"],
};

const renderAnswerQuestion = (questionId = "q-123") => {
    return render(
        <MemoryRouter initialEntries={[`/questions/${questionId}`]}>
            <ThemeProvider>
                <Routes>
                    <Route path="/questions/:id" element={<AnswerQuestion />} />
                </Routes>
            </ThemeProvider>
        </MemoryRouter>
    );
};

describe("AnswerQuestion", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUseSubmitResponse.mockReturnValue({
            submit: vi.fn().mockResolvedValue({ response_id: "r-1", points_earned: 10 }),
            isSubmitting: false,
            error: null,
            result: null,
            reset: vi.fn(),
        });
    });

    it("shows loading state", () => {
        mockUseQuestion.mockReturnValue({
            question: null,
            isLoading: true,
            error: null,
            refetch: vi.fn(),
        });

        renderAnswerQuestion();

        // There are two "Loading..." texts - one in header and one in spinner sr-only
        expect(screen.getAllByText("Loading...").length).toBeGreaterThanOrEqual(1);
        expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("shows error state with retry button", async () => {
        const mockRefetch = vi.fn();
        mockUseQuestion.mockReturnValue({
            question: null,
            isLoading: false,
            error: new Error("Failed to load"),
            refetch: mockRefetch,
        });

        renderAnswerQuestion();

        expect(screen.getByText("Something went wrong")).toBeInTheDocument();
        expect(screen.getByText("Failed to load")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Try Again" }));

        await waitFor(() => {
            expect(mockRefetch).toHaveBeenCalled();
        });
    });

    it("shows not found when question is null", () => {
        mockUseQuestion.mockReturnValue({
            question: null,
            isLoading: false,
            error: null,
            refetch: vi.fn(),
        });

        renderAnswerQuestion();

        expect(screen.getByText("Question not found")).toBeInTheDocument();
    });

    it("shows cannot answer when can_answer is false", () => {
        mockUseQuestion.mockReturnValue({
            question: { ...mockTextQuestion, can_answer: false },
            isLoading: false,
            error: null,
            refetch: vi.fn(),
        });

        renderAnswerQuestion();

        expect(screen.getByText("Already answered")).toBeInTheDocument();
    });

    it("renders text question form", () => {
        mockUseQuestion.mockReturnValue({
            question: mockTextQuestion,
            isLoading: false,
            error: null,
            refetch: vi.fn(),
        });

        renderAnswerQuestion();

        expect(screen.getByText(mockTextQuestion.prompt)).toBeInTheDocument();
        expect(screen.getByLabelText("Your Answer")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Submit Answer" })).toBeDisabled();
    });

    it("enables submit button when text is long enough", () => {
        mockUseQuestion.mockReturnValue({
            question: mockTextQuestion,
            isLoading: false,
            error: null,
            refetch: vi.fn(),
        });

        renderAnswerQuestion();

        const textarea = screen.getByLabelText("Your Answer");
        fireEvent.change(textarea, {
            target: { value: "This is my answer with enough characters" },
        });

        expect(screen.getByRole("button", { name: "Submit Answer" })).not.toBeDisabled();
    });

    it("shows character count for text questions", () => {
        mockUseQuestion.mockReturnValue({
            question: mockTextQuestion,
            isLoading: false,
            error: null,
            refetch: vi.fn(),
        });

        renderAnswerQuestion();

        expect(screen.getByText("0/5000")).toBeInTheDocument();
        expect(screen.getByText("At least 10 characters required")).toBeInTheDocument();

        const textarea = screen.getByLabelText("Your Answer");
        fireEvent.change(textarea, { target: { value: "Hello world!" } });

        expect(screen.getByText("12/5000")).toBeInTheDocument();
        expect(screen.getByText("Ready to submit")).toBeInTheDocument();
    });

    it("renders multiple choice question form", () => {
        mockUseQuestion.mockReturnValue({
            question: mockMultipleChoiceQuestion,
            isLoading: false,
            error: null,
            refetch: vi.fn(),
        });

        renderAnswerQuestion();

        expect(screen.getByText(mockMultipleChoiceQuestion.prompt)).toBeInTheDocument();
        expect(screen.getByText("Red")).toBeInTheDocument();
        expect(screen.getByText("Blue")).toBeInTheDocument();
        expect(screen.getByText("Green")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Submit Answer" })).toBeDisabled();
    });

    it("enables submit when option is selected", () => {
        mockUseQuestion.mockReturnValue({
            question: mockMultipleChoiceQuestion,
            isLoading: false,
            error: null,
            refetch: vi.fn(),
        });

        renderAnswerQuestion();

        fireEvent.click(screen.getByLabelText("Blue"));

        expect(screen.getByRole("button", { name: "Submit Answer" })).not.toBeDisabled();
    });

    it("submits text answer and navigates to confirmation", async () => {
        const mockSubmit = vi.fn().mockResolvedValue({ response_id: "r-1", points_earned: 15 });
        mockUseSubmitResponse.mockReturnValue({
            submit: mockSubmit,
            isSubmitting: false,
            error: null,
            result: null,
            reset: vi.fn(),
        });

        mockUseQuestion.mockReturnValue({
            question: mockTextQuestion,
            isLoading: false,
            error: null,
            refetch: vi.fn(),
        });

        renderAnswerQuestion();

        const textarea = screen.getByLabelText("Your Answer");
        fireEvent.change(textarea, { target: { value: "My detailed answer here" } });

        fireEvent.click(screen.getByRole("button", { name: "Submit Answer" }));

        await waitFor(() => {
            expect(mockSubmit).toHaveBeenCalledWith({
                question_id: "q-123",
                answer: "My detailed answer here",
            });
        });

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith("/confirmation", {
                state: { pointsEarned: 15 },
            });
        });
    });

    it("submits multiple choice answer", async () => {
        const mockSubmit = vi.fn().mockResolvedValue({ response_id: "r-1", points_earned: 10 });
        mockUseSubmitResponse.mockReturnValue({
            submit: mockSubmit,
            isSubmitting: false,
            error: null,
            result: null,
            reset: vi.fn(),
        });

        mockUseQuestion.mockReturnValue({
            question: mockMultipleChoiceQuestion,
            isLoading: false,
            error: null,
            refetch: vi.fn(),
        });

        renderAnswerQuestion();

        fireEvent.click(screen.getByLabelText("Green"));
        fireEvent.click(screen.getByRole("button", { name: "Submit Answer" }));

        await waitFor(() => {
            expect(mockSubmit).toHaveBeenCalledWith({
                question_id: "q-456",
                selected_option: 2,
            });
        });
    });

    it("shows submit error", () => {
        mockUseSubmitResponse.mockReturnValue({
            submit: vi.fn(),
            isSubmitting: false,
            error: new Error("Submission failed"),
            result: null,
            reset: vi.fn(),
        });

        mockUseQuestion.mockReturnValue({
            question: mockTextQuestion,
            isLoading: false,
            error: null,
            refetch: vi.fn(),
        });

        renderAnswerQuestion();

        expect(screen.getByText("Submission failed")).toBeInTheDocument();
    });

    it("shows loading state during submission", () => {
        mockUseSubmitResponse.mockReturnValue({
            submit: vi.fn(),
            isSubmitting: true,
            error: null,
            result: null,
            reset: vi.fn(),
        });

        mockUseQuestion.mockReturnValue({
            question: mockTextQuestion,
            isLoading: false,
            error: null,
            refetch: vi.fn(),
        });

        renderAnswerQuestion();

        expect(screen.getByRole("button", { name: "Loading..." })).toBeDisabled();
    });

    it("navigates back when back button clicked", () => {
        mockUseQuestion.mockReturnValue({
            question: mockTextQuestion,
            isLoading: false,
            error: null,
            refetch: vi.fn(),
        });

        renderAnswerQuestion();

        fireEvent.click(screen.getByRole("button", { name: /back/i }));

        expect(mockNavigate).toHaveBeenCalledWith("/");
    });

    it("displays responses needed text", () => {
        mockUseQuestion.mockReturnValue({
            question: mockTextQuestion,
            isLoading: false,
            error: null,
            refetch: vi.fn(),
        });

        renderAnswerQuestion();

        expect(screen.getByText("5 more responses needed")).toBeInTheDocument();
    });

    it("displays singular response needed", () => {
        mockUseQuestion.mockReturnValue({
            question: { ...mockTextQuestion, responses_needed: 1 },
            isLoading: false,
            error: null,
            refetch: vi.fn(),
        });

        renderAnswerQuestion();

        expect(screen.getByText("1 more response needed")).toBeInTheDocument();
    });

    it("displays almost done when no responses needed", () => {
        mockUseQuestion.mockReturnValue({
            question: { ...mockTextQuestion, responses_needed: 0 },
            isLoading: false,
            error: null,
            refetch: vi.fn(),
        });

        renderAnswerQuestion();

        expect(screen.getByText("Almost done collecting responses")).toBeInTheDocument();
    });
});
