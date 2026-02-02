import "@testing-library/jest-dom/vitest";

// Mock window.matchMedia for ThemeContext tests
Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
        matches: query === "(prefers-color-scheme: dark)",
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
    }),
});
