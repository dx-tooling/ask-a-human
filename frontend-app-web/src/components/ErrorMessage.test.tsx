import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorMessage } from "./ErrorMessage";

describe("ErrorMessage", () => {
    it("renders default title and provided message", () => {
        render(<ErrorMessage message="Something broke" />);
        expect(screen.getByText("Something went wrong")).toBeInTheDocument();
        expect(screen.getByText("Something broke")).toBeInTheDocument();
    });

    it("renders custom title", () => {
        render(<ErrorMessage title="Custom Error" message="Error details" />);
        expect(screen.getByText("Custom Error")).toBeInTheDocument();
    });

    it("shows retry button when onRetry is provided", () => {
        const handleRetry = vi.fn();
        render(<ErrorMessage message="Error" onRetry={handleRetry} />);
        expect(screen.getByRole("button", { name: "Try Again" })).toBeInTheDocument();
    });

    it("does not show retry button when onRetry is not provided", () => {
        render(<ErrorMessage message="Error" />);
        expect(screen.queryByRole("button", { name: "Try Again" })).not.toBeInTheDocument();
    });

    it("calls onRetry when retry button is clicked", () => {
        const handleRetry = vi.fn();
        render(<ErrorMessage message="Error" onRetry={handleRetry} />);
        fireEvent.click(screen.getByRole("button", { name: "Try Again" }));
        expect(handleRetry).toHaveBeenCalledTimes(1);
    });

    it("renders the error icon", () => {
        render(<ErrorMessage message="Error" />);
        const icon = document.querySelector('svg[aria-hidden="true"]');
        expect(icon).toBeInTheDocument();
    });
});
