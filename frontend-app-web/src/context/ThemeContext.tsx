import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useSyncExternalStore,
    type ReactNode,
} from "react";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
    theme: Theme;
    resolvedTheme: ResolvedTheme;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_STORAGE_KEY = "theme";

function getSystemTheme(): ResolvedTheme {
    if (typeof window === "undefined") return "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getStoredTheme(): Theme {
    if (typeof window === "undefined") return "system";
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
        return stored;
    }
    return "system";
}

function applyThemeToDOM(resolvedTheme: ResolvedTheme): void {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(resolvedTheme);
}

// Custom hook for subscribing to system theme changes
function useSystemTheme(): ResolvedTheme {
    return useSyncExternalStore(
        (callback) => {
            const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
            mediaQuery.addEventListener("change", callback);
            return () => {
                mediaQuery.removeEventListener("change", callback);
            };
        },
        () => getSystemTheme(),
        () => "dark" as ResolvedTheme
    );
}

interface ThemeProviderProps {
    children: ReactNode;
    defaultTheme?: Theme;
}

export function ThemeProvider({ children, defaultTheme = "dark" }: ThemeProviderProps) {
    // Use useSyncExternalStore for localStorage to handle SSR properly
    const storedTheme = useSyncExternalStore(
        (callback) => {
            window.addEventListener("storage", callback);
            return () => {
                window.removeEventListener("storage", callback);
            };
        },
        () => getStoredTheme(),
        () => defaultTheme
    );

    const systemTheme = useSystemTheme();

    // Calculate resolved theme without useState
    const resolvedTheme: ResolvedTheme =
        storedTheme === "system" ? systemTheme : storedTheme === "dark" ? "dark" : "light";

    // Apply theme to DOM whenever resolved theme changes
    useEffect(() => {
        applyThemeToDOM(resolvedTheme);
    }, [resolvedTheme]);

    const setTheme = (newTheme: Theme) => {
        localStorage.setItem(THEME_STORAGE_KEY, newTheme);
        // Dispatch storage event for same-window updates
        window.dispatchEvent(new StorageEvent("storage", { key: THEME_STORAGE_KEY }));
    };

    const toggleTheme = () => {
        const nextTheme = resolvedTheme === "dark" ? "light" : "dark";
        setTheme(nextTheme);
    };

    const value = useMemo(
        () => ({
            theme: storedTheme,
            resolvedTheme,
            setTheme,
            toggleTheme,
        }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [storedTheme, resolvedTheme]
    );

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeContextValue {
    const context = useContext(ThemeContext);
    if (context === null) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
}
