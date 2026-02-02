import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
    static targets = ["toggleButton"];

    declare readonly toggleButtonTarget: HTMLButtonElement;
    declare readonly hasToggleButtonTarget: boolean;

    connect() {
        this.applyTheme();
    }

    toggle() {
        // Determine the *new* theme based on the *current* visual state
        const isCurrentlyDark = document.documentElement.classList.contains("dark");
        const newTheme = isCurrentlyDark ? "light" : "dark";

        localStorage.setItem("theme", newTheme);
        this.applyTheme(newTheme);
    }

    applyTheme(theme: string | null = null) {
        const selectedTheme = theme ?? localStorage.getItem("theme");
        const osPreferenceDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        const htmlElement = document.documentElement;

        let effectiveTheme: "dark" | "light";

        if (selectedTheme === "dark" || (selectedTheme === null && osPreferenceDark)) {
            htmlElement.classList.add("dark");
            effectiveTheme = "dark";
        } else {
            htmlElement.classList.remove("dark");
            effectiveTheme = "light";
        }

        // Update button text (optional, but good UX)
        if (this.hasToggleButtonTarget) {
            this.toggleButtonTarget.textContent =
                effectiveTheme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode";
        }
    }
}
