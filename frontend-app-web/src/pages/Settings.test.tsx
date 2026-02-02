import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { Settings } from "./Settings";
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

const renderSettings = () => {
    return render(
        <BrowserRouter>
            <ThemeProvider>
                <Settings />
            </ThemeProvider>
        </BrowserRouter>
    );
};

describe("Settings", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it("renders settings page with header", () => {
        renderSettings();

        expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    it("renders appearance section with theme options", () => {
        renderSettings();

        expect(screen.getByText("Appearance")).toBeInTheDocument();
        expect(screen.getByText("Dark")).toBeInTheDocument();
        expect(screen.getByText("Light")).toBeInTheDocument();
        expect(screen.getByText("System")).toBeInTheDocument();
    });

    it("shows theme descriptions", () => {
        renderSettings();

        expect(screen.getByText("Always use dark theme")).toBeInTheDocument();
        expect(screen.getByText("Always use light theme")).toBeInTheDocument();
        expect(screen.getByText("Follow your device settings")).toBeInTheDocument();
    });

    it("allows selecting theme option", () => {
        renderSettings();

        // Default should be system (checked)
        const systemRadio = screen.getByRole("radio", { name: /System/ });
        expect(systemRadio).toHaveAttribute("aria-checked", "true");

        // Click on Light option
        const lightOption = screen.getByText("Light").closest('[role="radio"]')!;
        fireEvent.click(lightOption);

        // Light should now be selected
        expect(lightOption).toHaveAttribute("aria-checked", "true");
    });

    it("navigates back when back button is clicked", () => {
        renderSettings();

        // Find and click back button (in header)
        const backButton = screen.getByRole("button", { name: /back/i });
        fireEvent.click(backButton);

        expect(mockNavigate).toHaveBeenCalledWith("/");
    });

    it("renders notifications section", () => {
        renderSettings();

        expect(screen.getByText("Notifications")).toBeInTheDocument();
        expect(screen.getByText("Push notification settings coming soon.")).toBeInTheDocument();
    });

    it("renders about section", () => {
        renderSettings();

        expect(screen.getByText("About")).toBeInTheDocument();
        expect(screen.getByText(/Ask a Human helps AI agents/)).toBeInTheDocument();
        expect(screen.getByText("Version 0.1.0")).toBeInTheDocument();
    });

    it("theme selection with keyboard", () => {
        renderSettings();

        const darkOption = screen.getByText("Dark").closest('[role="radio"]')!;

        // Press Enter to select
        fireEvent.keyDown(darkOption, { key: "Enter" });
        expect(darkOption).toHaveAttribute("aria-checked", "true");

        // Press Space to select another
        const lightOption = screen.getByText("Light").closest('[role="radio"]')!;
        fireEvent.keyDown(lightOption, { key: " " });
        expect(lightOption).toHaveAttribute("aria-checked", "true");
    });
});
