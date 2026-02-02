import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Card, CardContent } from "./Card";

describe("Card", () => {
    it("renders children", () => {
        render(
            <Card>
                <span>Card content</span>
            </Card>
        );
        expect(screen.getByText("Card content")).toBeInTheDocument();
    });

    it("renders as div by default", () => {
        const { container } = render(<Card>Content</Card>);
        const card = container.firstChild;
        expect(card?.nodeName).toBe("DIV");
    });

    it("renders as article when specified", () => {
        const { container } = render(<Card as="article">Content</Card>);
        const card = container.firstChild;
        expect(card?.nodeName).toBe("ARTICLE");
    });

    it("renders as button when specified", () => {
        const { container } = render(<Card as="button">Content</Card>);
        const card = container.firstChild;
        expect(card?.nodeName).toBe("BUTTON");
    });

    it("applies custom className", () => {
        const { container } = render(<Card className="custom-class">Content</Card>);
        const card = container.firstChild as HTMLElement;
        expect(card).toHaveClass("custom-class");
    });

    it("calls onClick when clicked", () => {
        const handleClick = vi.fn();
        const { container } = render(<Card onClick={handleClick}>Clickable</Card>);
        fireEvent.click(container.firstChild!);
        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("applies interactive styles when onClick is provided", () => {
        const handleClick = vi.fn();
        const { container } = render(<Card onClick={handleClick}>Interactive</Card>);
        const card = container.firstChild as HTMLElement;
        expect(card).toHaveClass("cursor-pointer");
    });

    it("applies interactive styles when rendered as button", () => {
        const { container } = render(<Card as="button">Button Card</Card>);
        const card = container.firstChild as HTMLElement;
        expect(card).toHaveClass("cursor-pointer");
    });

    it("does not apply interactive styles without onClick or button", () => {
        const { container } = render(<Card>Static</Card>);
        const card = container.firstChild as HTMLElement;
        expect(card).not.toHaveClass("cursor-pointer");
    });
});

describe("CardContent", () => {
    it("renders children", () => {
        render(
            <CardContent>
                <span>Content inside</span>
            </CardContent>
        );
        expect(screen.getByText("Content inside")).toBeInTheDocument();
    });

    it("applies custom className", () => {
        const { container } = render(<CardContent className="extra-padding">Content</CardContent>);
        const content = container.firstChild as HTMLElement;
        expect(content).toHaveClass("extra-padding");
    });

    it("applies default padding", () => {
        const { container } = render(<CardContent>Padded</CardContent>);
        const content = container.firstChild as HTMLElement;
        expect(content).toHaveClass("p-4");
    });
});
