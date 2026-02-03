import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "./Button";

describe("Button", () => {
    it("renders children", () => {
        render(<Button>Click me</Button>);
        expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
    });

    it("calls onClick when clicked", () => {
        const handleClick = vi.fn();
        render(<Button onClick={handleClick}>Click</Button>);
        fireEvent.click(screen.getByRole("button"));
        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    describe("variants", () => {
        it("applies primary variant styles by default", () => {
            render(<Button>Primary</Button>);
            const button = screen.getByRole("button");
            expect(button).toHaveClass("from-blue-600", "to-blue-700");
        });

        it("applies secondary variant styles", () => {
            render(<Button variant="secondary">Secondary</Button>);
            const button = screen.getByRole("button");
            expect(button).toHaveClass("bg-gray-200");
        });

        it("applies ghost variant styles", () => {
            render(<Button variant="ghost">Ghost</Button>);
            const button = screen.getByRole("button");
            expect(button).toHaveClass("bg-transparent");
        });
    });

    describe("sizes", () => {
        it("applies medium size by default", () => {
            render(<Button>Medium</Button>);
            const button = screen.getByRole("button");
            expect(button).toHaveClass("px-4", "py-2");
        });

        it("applies small size styles", () => {
            render(<Button size="sm">Small</Button>);
            const button = screen.getByRole("button");
            expect(button).toHaveClass("px-3", "py-1.5");
        });

        it("applies large size styles", () => {
            render(<Button size="lg">Large</Button>);
            const button = screen.getByRole("button");
            expect(button).toHaveClass("px-8", "py-4");
        });
    });

    describe("loading state", () => {
        it("shows loading spinner when isLoading is true", () => {
            render(<Button isLoading>Submit</Button>);
            expect(screen.getByText("Loading...")).toBeInTheDocument();
        });

        it("disables button when isLoading is true", () => {
            render(<Button isLoading>Submit</Button>);
            expect(screen.getByRole("button")).toBeDisabled();
        });

        it("hides children text when loading", () => {
            render(<Button isLoading>Submit</Button>);
            expect(screen.queryByText("Submit")).not.toBeInTheDocument();
        });
    });

    describe("disabled state", () => {
        it("disables button when disabled prop is true", () => {
            render(<Button disabled>Disabled</Button>);
            expect(screen.getByRole("button")).toBeDisabled();
        });

        it("does not call onClick when disabled", () => {
            const handleClick = vi.fn();
            render(
                <Button disabled onClick={handleClick}>
                    Disabled
                </Button>
            );
            fireEvent.click(screen.getByRole("button"));
            expect(handleClick).not.toHaveBeenCalled();
        });
    });

    describe("fullWidth", () => {
        it("applies full width class when fullWidth is true", () => {
            render(<Button fullWidth>Full Width</Button>);
            const button = screen.getByRole("button");
            expect(button).toHaveClass("w-full");
        });

        it("does not apply full width class by default", () => {
            render(<Button>Normal</Button>);
            const button = screen.getByRole("button");
            expect(button).not.toHaveClass("w-full");
        });
    });

    it("applies custom className", () => {
        render(<Button className="custom-class">Custom</Button>);
        const button = screen.getByRole("button");
        expect(button).toHaveClass("custom-class");
    });
});
