import { Application } from "@hotwired/stimulus";
import ModalController from "../../src/controllers/modal_controller";

// Helper to set up the DOM and start Stimulus
const setupDOM = async (): Promise<{
    application: Application;
    modalElement: HTMLElement;
    openButton: HTMLButtonElement;
    closeButton: HTMLButtonElement;
    modalContent: HTMLElement;
}> => {
    document.body.innerHTML = `
    <div data-controller="modal">
      <button data-action="click->modal#open" id="openBtn">Open Modal</button>
      <div data-modal-target="modal" data-action="click->modal#closeBackground" id="modalBackdrop" style="display: none;">
        <!-- Modal Content -->
        <div id="modalContent" style="background: white; padding: 20px;">
          Modal Content Here
          <button data-action="click->modal#close" id="closeBtn">Close</button>
        </div>
      </div>
    </div>
  `;

    const application = Application.start();
    application.register("modal", ModalController);

    // Wait for Stimulus connect to potentially run
    await new Promise((resolve) => setTimeout(resolve, 0));

    const modalElement = document.getElementById("modalBackdrop") as HTMLElement;
    const openButton = document.getElementById("openBtn") as HTMLButtonElement;
    const closeButton = document.getElementById("closeBtn") as HTMLButtonElement;
    const modalContent = document.getElementById("modalContent") as HTMLElement;

    return { application, modalElement, openButton, closeButton, modalContent };
};

describe("ModalController", () => {
    let application: Application;
    let modalElement: HTMLElement;
    let openButton: HTMLButtonElement;
    let closeButton: HTMLButtonElement;
    let modalContent: HTMLElement;

    beforeEach(async () => {
        const setup = await setupDOM();
        application = setup.application;
        modalElement = setup.modalElement;
        openButton = setup.openButton;
        closeButton = setup.closeButton;
        modalContent = setup.modalContent;
    });

    afterEach(() => {
        application?.stop();
        document.body.innerHTML = ""; // Clean up DOM
    });

    it("should hide the modal on connect", () => {
        // The beforeEach already sets up the DOM and connects the controller
        expect(modalElement.style.display).toBe("none");
    });

    it("should show the modal when open action is triggered", async () => {
        openButton.click();
        await new Promise((resolve) => setTimeout(resolve, 0)); // Wait for potential DOM updates
        expect(modalElement.style.display).toBe("block");
    });

    it("should hide the modal when close action is triggered", async () => {
        // First open the modal
        openButton.click();
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(modalElement.style.display).toBe("block");

        // Then close it
        closeButton.click();
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(modalElement.style.display).toBe("none");
    });

    it("should hide the modal when clicking the background (modal target)", async () => {
        // First open the modal
        openButton.click();
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(modalElement.style.display).toBe("block");

        // Simulate click on the backdrop itself
        modalElement.click();
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(modalElement.style.display).toBe("none");
    });

    it("should not hide the modal when clicking inside the modal content", async () => {
        // First open the modal
        openButton.click();
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(modalElement.style.display).toBe("block");

        // Simulate click on an element *inside* the modal backdrop
        modalContent.click(); // Click the inner div
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(modalElement.style.display).toBe("block"); // Should remain open
    });
});
