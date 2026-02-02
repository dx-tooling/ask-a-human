import { Application } from "@hotwired/stimulus";

declare global {
    interface Window {
        Stimulus: Application;
    }
}

export {}; // Ensure this file is treated as a module
