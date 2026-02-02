import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
    it("renders with default props", () => {
        render(<EmptyState />);
        expect(screen.getByText("No questions yet")).toBeInTheDocument();
        expect(screen.getByText("Waiting for new questions...")).toBeInTheDocument();
    });

    it("renders custom title", () => {
        render(<EmptyState title="Custom Title" />);
        expect(screen.getByText("Custom Title")).toBeInTheDocument();
    });

    it("renders custom message", () => {
        render(<EmptyState message="Custom message here" />);
        expect(screen.getByText("Custom message here")).toBeInTheDocument();
    });

    it("shows polling indicator by default", () => {
        render(<EmptyState />);
        expect(screen.getByText("Checking for questions...")).toBeInTheDocument();
    });

    it("hides polling indicator when isPolling is false", () => {
        render(<EmptyState isPolling={false} />);
        expect(screen.queryByText("Checking for questions...")).not.toBeInTheDocument();
    });

    it("renders the question mark icon", () => {
        render(<EmptyState />);
        // The SVG should be present with aria-hidden
        const icon = document.querySelector('svg[aria-hidden="true"]');
        expect(icon).toBeInTheDocument();
    });
});
