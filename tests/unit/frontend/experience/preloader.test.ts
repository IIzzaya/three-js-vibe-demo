// @vitest-environment jsdom
import { EventEmitter } from "events";
import { beforeEach, describe, expect, it, vi } from "vitest";

const debugBus = {
    emit: vi.fn(),
};

let mockResources: EventEmitter;

vi.mock("../../../../frontend/Experience/Experience.js", () => ({
    default: vi.fn(() => ({
        resources: mockResources,
        debugBus,
    })),
}));

vi.mock("gsap", () => {
    const timelineFactory = () => ({
        to: vi.fn().mockReturnThis(),
    });
    return {
        default: {
            timeline: vi.fn(timelineFactory),
            matchMedia: vi.fn(() => ({})),
        },
    };
});

function setupDOM(): void {
    document.body.innerHTML = `
        <div class="preloader">
            <div class="preloader-wrapper">
                <div class="startup-badge">three-js-vibe-demo</div>
                <div class="progress-bar-container">
                    <div class="progress-bar"></div>
                </div>
            </div>
            <div class="progress-wrapper">
                <div class="preloader-percentage1">0</div>
                <div class="preloader-percentage2">0</div>
                <div class="symbol">%</div>
            </div>
            <h1 class="preloader-title fade-in-out">Loading whitebox</h1>
            <div class="welcome-title"></div>
            <div class="name-form"></div>
            <input id="name-input" />
            <button id="name-input-button"></button>
            <div class="description">Initializing scene, character, and networking.</div>
        </div>
    `;
}

describe("Preloader", () => {
    beforeEach(() => {
        setupDOM();
        mockResources = new EventEmitter();
        debugBus.emit.mockReset();
    });

    it("treats an empty queue as fully loaded", async () => {
        const { default: Preloader } =
            await import("../../../../frontend/Experience/Preloader.js");

        const preloader = new Preloader();
        preloader.updateProgress(0, 0);

        expect(preloader.amountDone).toBe(100);
    });

    it("updates visible progress as loading events arrive", async () => {
        const { default: Preloader } =
            await import("../../../../frontend/Experience/Preloader.js");

        const preloader = new Preloader();
        mockResources.emit("loading", 1, 2);

        for (let i = 0; i < 50; i++) {
            preloader.update();
        }

        expect(preloader.amountDone).toBe(50);
        expect(
            document.querySelector(".progress-bar")?.getAttribute("style"),
        ).toContain("width: 50%");
    });

    it("shows a failure state when resource loading fails", async () => {
        const { default: Preloader } =
            await import("../../../../frontend/Experience/Preloader.js");

        const preloader = new Preloader();
        mockResources.emit("failed", [
            {
                asset: {
                    name: "placeholder-character",
                    path: "/models/placeholder-character.glb",
                },
                message: "missing model",
            },
        ]);

        expect(preloader.state).toBe("failed");
        expect(
            document
                .querySelector(".preloader")
                ?.classList.contains("is-error"),
        ).toBe(true);
        expect(
            document.querySelector(".preloader-title")?.textContent,
        ).toContain("Startup failed");
        expect(document.querySelector(".description")?.textContent).toContain(
            "could not be loaded",
        );
        expect(debugBus.emit).toHaveBeenCalledWith("startup", "failed", {
            errors: [
                {
                    assetName: "placeholder-character",
                    path: "/models/placeholder-character.glb",
                    message: "missing model",
                },
            ],
        });
    });

    it("starts the intro sequence when resources are ready", async () => {
        const { default: Preloader } =
            await import("../../../../frontend/Experience/Preloader.js");

        const preloader = new Preloader();
        const playIntroSpy = vi
            .spyOn(preloader, "playIntro")
            .mockResolvedValue(undefined);

        mockResources.emit("ready");

        expect(preloader.state).toBe("ready");
        expect(preloader.amountDone).toBe(100);
        expect(playIntroSpy).toHaveBeenCalled();
        expect(debugBus.emit).toHaveBeenCalledWith("startup", "ready", {
            progress: 100,
        });
    });

    it("invokes onPlayerReady callback with the entered name", async () => {
        const { default: Preloader } =
            await import("../../../../frontend/Experience/Preloader.js");

        const preloader = new Preloader();
        const received: string[] = [];
        preloader.onPlayerReady = (name) => received.push(name);

        (document.getElementById("name-input") as HTMLInputElement).value =
            "Alice";
        preloader.onNameInput();

        expect(received).toEqual(["Alice"]);
    });

    it("ignores empty name input", async () => {
        const { default: Preloader } =
            await import("../../../../frontend/Experience/Preloader.js");

        const preloader = new Preloader();
        const received: string[] = [];
        preloader.onPlayerReady = (name) => received.push(name);

        (document.getElementById("name-input") as HTMLInputElement).value = "";
        preloader.onNameInput();

        expect(received).toEqual([]);
    });
});
