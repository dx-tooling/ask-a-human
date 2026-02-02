import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { Confirmation } from "./Confirmation";
import { ThemeProvider } from "@/context/ThemeContext";

// Mock navigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
    const actual = await vi.importActual("react-router-dom");
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

interface RenderConfirmationOptions {
    pointsEarned?: number;
}

const renderConfirmation = (options: RenderConfirmationOptions = {}) => {
    const state = options.pointsEarned !== undefined ? { pointsEarned: options.pointsEarned } : null;

    return render(
        <MemoryRouter
            initialEntries={[{ pathname: "/confirmation", state }]}
        >
            <ThemeProvider>
                <Routes>
                    <Route path="/confirmation" element={<Confirmation />} />
                </Routes>
            </ThemeProvider>
        </MemoryRouter>
    );
};

describe("Confirmation", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("displays thank you message", () => {
        renderConfirmation();

        expect(screen.getByText("Thank you!")).toBeInTheDocument();
        expect(screen.getByText("Your answer has been submitted successfully.")).toBeInTheDocument();
    });

    it("displays points earned from state", () => {
        renderConfirmation({ pointsEarned: 25 });

        expect(screen.getByText("+25")).toBeInTheDocument();
    });

    it("displays default points (10) when no state provided", () => {
        renderConfirmation();

        expect(screen.getByText("+10")).toBeInTheDocument();
    });

    it("shows countdown timer", () => {
        renderConfirmation();

        expect(screen.getByText(/Returning to feed in 5 seconds/)).toBeInTheDocument();
    });

    it("decrements countdown timer", () => {
        renderConfirmation();

        expect(screen.getByText(/5 second/)).toBeInTheDocument();

        act(() => {
            vi.advanceTimersByTime(1000);
        });
        expect(screen.getByText(/4 second/)).toBeInTheDocument();

        act(() => {
            vi.advanceTimersByTime(1000);
        });
        expect(screen.getByText(/3 second/)).toBeInTheDocument();
    });

    it("shows singular 'second' at 1 second", () => {
        renderConfirmation();

        act(() => {
            vi.advanceTimersByTime(4000);
        });
        // Just check that it says "1 second" (not "1 seconds")
        expect(screen.getByText(/1 second\b/)).toBeInTheDocument();
    });

    it("navigates to feed when countdown reaches 0", () => {
        renderConfirmation();

        act(() => {
            vi.advanceTimersByTime(5000);
        });

        expect(mockNavigate).toHaveBeenCalledWith("/");
    });

    it("navigates to feed when 'Answer Another' button is clicked", () => {
        renderConfirmation();

        fireEvent.click(screen.getByRole("button", { name: "Answer Another Question" }));

        expect(mockNavigate).toHaveBeenCalledWith("/");
    });

    it("renders success icon", () => {
        renderConfirmation();

        const icon = document.querySelector('svg[aria-hidden="true"]');
        expect(icon).toBeInTheDocument();
    });
});
