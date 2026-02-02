import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
    static targets = ["modal", "button"];

    declare readonly modalTarget: HTMLElement;

    connect() {
        this.modalTarget.style.display = "none";
    }

    open() {
        this.modalTarget.style.display = "block";
    }

    close() {
        this.modalTarget.style.display = "none";
    }

    closeBackground(event: MouseEvent) {
        // If the click target is the modal container itself (the backdrop),
        // and not one of its children (like the modal panel), then close.
        if (event.target === this.modalTarget) {
            this.close();
        }
    }
}
