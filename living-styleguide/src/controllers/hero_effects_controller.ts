import { Controller } from "@hotwired/stimulus";

export default class HeroEffectsController extends Controller {
    private observer: IntersectionObserver | null = null;

    static intersectionOptions = {
        threshold: 0.1, // Trigger when 10% of the element is visible
    };
    static activeClass = "effects-active";

    connect() {
        // Check if already activated (e.g., by previous navigation)
        if (this.element.classList.contains(HeroEffectsController.activeClass)) {
            return; // Don't re-initialize if already active
        }

        this.observer = new IntersectionObserver((entries, observerInstance) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    this.activate();
                    // Stop observing once activated to prevent redundant calls
                    observerInstance.unobserve(entry.target);
                }
            });
        }, HeroEffectsController.intersectionOptions);

        // Observe the element immediately. The callback will fire
        // quickly if it's already intersecting.
        this.observer.observe(this.element);
    }

    disconnect() {
        // No longer need to clear timeout

        // Stop observing
        if (this.observer) {
            // Unobserve might have already happened in the callback, but calling it again is safe
            this.observer.unobserve(this.element);
            this.observer.disconnect();
            this.observer = null;
        }
    }

    activate() {
        // Add class if not already present
        if (!this.element.classList.contains(HeroEffectsController.activeClass)) {
            this.element.classList.add(HeroEffectsController.activeClass);
        }
    }
}
