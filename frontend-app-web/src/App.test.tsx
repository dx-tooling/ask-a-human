import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "./App";

describe("App", () => {
    it("renders the feed page with header", () => {
        render(<App />);
        expect(screen.getByText("Ask a Human")).toBeInTheDocument();
    });
});
