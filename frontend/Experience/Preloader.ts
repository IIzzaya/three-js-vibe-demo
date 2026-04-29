import Experience from "./Experience.js";
import elements from "./Utils/functions/elements.js";
import gsap from "gsap";

interface StartupLoadError {
    asset: {
        name: string;
        path: string | string[];
    };
    message: string;
}

/**
 * Preloader — 白盒启动流程简化版
 *
 * 职责：
 * 1. 展示资源加载进度条
 * 2. 资源 ready 后弹出 name-entry 表单
 * 3. 用户确认名字后，GSAP 淡出遮罩，通过 `onPlayerReady` 回调通知外部
 *
 * 不负责英雄选择、大厅房间列表、房间切换过渡等。
 * 未来加入菜单 / 关卡选择时在此处扩展。
 */
export default class Preloader {
    experience: Experience;
    resources: Experience["resources"];
    loaded: number;
    queue: number;
    counter: number;
    amountDone: number;
    domElements: Record<string, HTMLElement>;
    flag: boolean;
    introTimeline: gsap.core.Timeline | null;
    outroTimeline: gsap.core.Timeline | null;
    state: "loading" | "ready" | "failed";
    introStarted: boolean;

    /**
     * Fires once the player has confirmed their name and the preloader
     * overlay has begun fading out. The whitebox canvas becomes interactive
     * immediately after this callback returns.
     */
    onPlayerReady?: (name: string) => void;

    constructor() {
        this.experience = new Experience();
        this.resources = this.experience.resources;

        this.loaded = 0;
        this.queue = 0;
        this.counter = 0;
        this.amountDone = 0;
        this.flag = false;
        this.state = "loading";
        this.introStarted = false;
        this.introTimeline = null;
        this.outroTimeline = null;

        this.domElements = elements({
            preloader: ".preloader",
            text1: ".preloader-percentage1",
            text2: ".preloader-percentage2",
            progressBar: ".progress-bar",
            startupBadge: ".startup-badge",
            progressBarContainer: ".progress-bar-container",
            progressWrapper: ".progress-wrapper",
            preloaderTitle: ".preloader-title",
            preloaderWrapper: ".preloader-wrapper",
            welcomeTitle: ".welcome-title",
            nameForm: ".name-form",
            nameInput: "#name-input",
            nameInputButton: "#name-input-button",
            description: ".description",
        });

        this.resources.on("loading", (loaded: number, queue: number) => {
            this.updateProgress(loaded, queue);
            this.experience.debugBus.emit("startup", "progress", {
                loaded,
                queue,
                progress: this.amountDone,
            });
        });

        this.resources.on(
            "load-error",
            (payload: {
                assetName: string;
                path: string | string[];
                message: string;
            }) => {
                this.experience.debugBus.emit(
                    "startup",
                    "asset-error",
                    payload,
                );
            },
        );

        this.resources.on("failed", (errors: StartupLoadError[]) => {
            this.showLoadFailure(errors);
        });

        this.resources.on("ready", () => {
            this.state = "ready";
            this.amountDone = 100;
            this.experience.debugBus.emit("startup", "ready", {
                progress: 100,
            });
            void this.playIntro();
        });

        this.addEventListeners();
    }

    updateProgress(loaded: number, queue: number): void {
        if (queue <= 0) {
            this.amountDone = 100;
            return;
        }
        this.amountDone = Math.round((loaded / queue) * 100);
    }

    showLoadFailure(errors: StartupLoadError[]): void {
        this.state = "failed";
        this.amountDone = 100;
        this.flag = true;
        this.domElements.preloader.classList.add("is-error");
        this.domElements.preloaderTitle.classList.remove("fade-in-out");
        this.domElements.preloaderTitle.textContent = "Startup failed";
        this.domElements.description.textContent =
            "Core assets could not be loaded. Check the console and refresh to retry.";
        this.domElements.progressBar.style.width = "100%";

        this.experience.debugBus.emit("startup", "failed", {
            errors: errors.map((error) => ({
                assetName: error.asset.name,
                path: error.asset.path,
                message: error.message,
            })),
        });
    }

    async playIntro(): Promise<void> {
        if (this.state === "failed" || this.introStarted) return;
        this.introStarted = true;

        return new Promise((resolve) => {
            this.introTimeline = gsap.timeline();
            this.introTimeline
                .to(this.domElements.startupBadge, {
                    opacity: 0,
                    duration: 1.0,
                    delay: 0.6,
                    top: "-120%",
                    ease: "power4.out",
                })
                .to(
                    this.domElements.progressBarContainer,
                    {
                        opacity: 0,
                        duration: 1.0,
                        top: "30%",
                        ease: "power4.out",
                    },
                    "-=0.9",
                )
                .to(
                    this.domElements.progressWrapper,
                    {
                        opacity: 0,
                        duration: 1.0,
                        bottom: "21%",
                        ease: "power4.out",
                    },
                    "-=0.9",
                )
                .to(
                    this.domElements.description,
                    {
                        opacity: 0,
                        duration: 1.0,
                        bottom: "35%",
                        ease: "power4.out",
                    },
                    "-=0.9",
                )
                .to(
                    this.domElements.preloaderTitle,
                    {
                        opacity: 0,
                        duration: 1.0,
                        bottom: "18%",
                        ease: "power4.out",
                        onUpdate: () => {
                            this.domElements.preloaderTitle.classList.remove(
                                "fade-in-out",
                            );
                        },
                        onComplete: () => {
                            this.domElements.startupBadge.remove();
                            this.domElements.progressBarContainer.remove();
                            this.domElements.progressWrapper.remove();
                            this.domElements.preloaderTitle.remove();
                            this.domElements.preloaderWrapper.remove();
                        },
                    },
                    "-=0.9",
                )
                .to(
                    this.domElements.welcomeTitle,
                    {
                        opacity: 1,
                        duration: 1.0,
                        top: "37%",
                        ease: "power4.out",
                    },
                    "-=0.8",
                )
                .to(
                    this.domElements.nameForm,
                    {
                        opacity: 1,
                        duration: 1.0,
                        top: "50%",
                        ease: "power4.out",
                    },
                    "-=0.8",
                )
                .to(
                    this.domElements.nameInputButton,
                    {
                        opacity: 1,
                        duration: 1.0,
                        bottom: "39%",
                        ease: "power4.out",
                        onComplete: () => {
                            resolve();
                        },
                    },
                    "-=0.8",
                );
        });
    }

    onNameInput = (): void => {
        const name = (
            this.domElements.nameInput as HTMLInputElement
        ).value.trim();
        if (name === "") return;
        void this.finishAndEnterWhitebox(name);
    };

    async finishAndEnterWhitebox(name: string): Promise<void> {
        this.experience.debugBus.emit("ui", "name-entered", { name });
        this.onPlayerReady?.(name);
        await this.preloaderOutro();
    }

    async preloaderOutro(): Promise<void> {
        return new Promise((resolve) => {
            this.outroTimeline = gsap.timeline();
            this.outroTimeline.to(this.domElements.preloader, {
                duration: 1.2,
                opacity: 0,
                ease: "power3.out",
                onComplete: () => {
                    this.domElements.preloader.remove();
                    resolve();
                },
            });
        });
    }

    addEventListeners(): void {
        this.domElements.nameInputButton.addEventListener(
            "click",
            this.onNameInput,
        );
        this.domElements.nameInput?.addEventListener("keydown", (e: Event) => {
            if ((e as KeyboardEvent).key === "Enter") this.onNameInput();
        });
    }

    update(): void {
        if (this.counter < this.amountDone) {
            this.counter++;
            this.domElements.text1.innerText = String(
                Math.round(this.counter / 10),
            );

            if (Math.round(this.counter / 10) !== 10) {
                this.domElements.text2.innerText = String(
                    Math.round(this.counter % 10),
                );
                this.flag = false;
            } else {
                this.domElements.text2.innerText = "0";
                this.flag = true;
            }

            this.domElements.progressBar.style.width =
                Math.round(this.counter) + "%";

            if (this.flag) {
                this.domElements.progressBar.style.width = "100%";
            }
        }
    }
}
