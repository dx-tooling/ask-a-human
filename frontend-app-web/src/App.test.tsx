import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import App from "./App";
import * as useQuestionsHook from "@/hooks/useQuestions";

// Mock the useQuestions hook to prevent async state updates
vi.mock("@/hooks/useQuestions", () => ({
    useQuestions: vi.fn(),
}));

const mockUseQuestions = vi.mocked(useQuestionsHook.useQuestions);

describe("App", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUseQuestions.mockReturnValue({
            questions: [],
            isLoading: false,
            error: null,
            refetch: vi.fn(),
        });
    });

    it("renders the feed page with header", async () => {
        render(<App />);

        await waitFor(() => {
            expect(screen.getByText("Ask a Human")).toBeInTheDocument();
        });
    });
});
