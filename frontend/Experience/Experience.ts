import * as THREE from "three";
import Sizes from "./Utils/Sizes.js";
import Time from "./Utils/Time.js";
import Resources from "./Utils/Resources.js";
import assets from "./Utils/assets.js";
import Camera from "./Camera.js";
import Renderer from "./Renderer.js";
import Preloader from "./Preloader.js";
import World from "./World/World.js";
import DebugBus from "./Debug/DebugBus.js";
import GM from "./Debug/GM.js";
import {
    getSeed,
    getTimeScale,
    setSeed as setRunSeed,
    setTimeScale as setRunTimeScale,
    isSeedLocked,
} from "./Utils/RunContext.js";
import type { Socket } from "socket.io-client";

export default class Experience {
    static instance: Experience;

    canvas!: HTMLCanvasElement;
    socket!: Socket;
    sizes!: Sizes;
    time!: Time;
    scene!: THREE.Scene;
    camera!: Camera;
    renderer!: Renderer;
    resources!: Resources;
    preloader!: Preloader;
    world!: World;
    debugBus!: DebugBus;
    gm!: GM;
    gameSocket?: Socket;
    lobbySocket?: Socket;

    constructor(canvas?: HTMLCanvasElement, socket?: Socket) {
        if (Experience.instance) {
            return Experience.instance;
        }

        Experience.instance = this;

        this.canvas = canvas!;
        this.socket = socket!;
        this.sizes = new Sizes();
        this.time = new Time();
        this.time.setTimeScale(getTimeScale());

        this.setDebug();
        this.registerSimulationGMCommands();
        this.setScene();
        this.setCamera();
        this.setRenderer();
        this.setResources();
        this.setPreloader();
        this.setWorld();

        this.sizes.on("resize", () => {
            this.onResize();
        });

        this.debugBus.emit("experience", "initialized", {
            canvas: !!canvas,
            socket: !!socket,
            seed: getSeed(),
            timeScale: this.time.timeScale,
        });
        this.debugBus.emit("sim", "seed-set", {
            seed: getSeed(),
            appliedAt: "session",
        });
        if (this.time.timeScale !== 1) {
            this.debugBus.emit("sim", "time-scale-changed", {
                from: 1,
                to: this.time.timeScale,
                source: "run-context",
            });
        }

        this.update();
    }

    /**
     * Apply a new time scale globally. Scales client-side simulation
     * (physics, skill CDs, wave timers, objective timers, extraction
     * countdown) and forwards the scale to the `/game` namespace server
     * over socket so server-side enemy ticks match.
     */
    setTimeScale(scale: number): number {
        const prev = this.time.setTimeScale(scale);
        const next = this.time.timeScale;
        if (prev !== next) {
            this.debugBus.emit("sim", "time-scale-changed", {
                from: prev,
                to: next,
                source: "runtime",
            });
            setRunTimeScale(next);
            if (this.gameSocket?.connected) {
                this.gameSocket.emit("set-time-scale", next);
            }
            if (this.lobbySocket?.connected) {
                this.lobbySocket.emit("set-time-scale", next);
            }
        }
        return next;
    }

    private registerSimulationGMCommands(): void {
        this.gm.register(
            "setTimeScale",
            "Set simulation time scale (clamped to [0.1, 4]). Returns new value.",
            (n: unknown) => this.setTimeScale(Number(n)),
        );
        this.gm.register(
            "getTimeScale",
            "Get current simulation time scale.",
            () => this.time.timeScale,
        );
        this.gm.register(
            "setSeed",
            "Set run seed. Only succeeds before World consumes seed; returns true/false.",
            (n: unknown) => {
                const parsed = Number(n);
                if (!Number.isFinite(parsed)) return false;
                if (isSeedLocked()) {
                    console.warn(
                        "[GM] setSeed rejected: world already initialized",
                    );
                    return false;
                }
                const ok = setRunSeed(parsed);
                if (ok) {
                    this.debugBus.emit("sim", "seed-set", {
                        seed: parsed | 0,
                        appliedAt: "gm-override",
                    });
                }
                return ok;
            },
        );
        this.gm.register("getSeed", "Get current run seed.", () => getSeed());
    }

    setDebug(): void {
        this.debugBus = new DebugBus();
        this.gm = new GM(this.debugBus);
    }

    setScene(): void {
        this.scene = new THREE.Scene();
    }

    setCamera(): void {
        this.camera = new Camera();
    }

    setRenderer(): void {
        this.renderer = new Renderer();
    }

    setResources(): void {
        this.resources = new Resources(assets);
    }

    setPreloader(): void {
        this.preloader = new Preloader();
    }

    setWorld(): void {
        this.world = new World();
    }

    onResize(): void {
        this.camera.onResize();
        this.renderer.onResize();
    }

    update(): void {
        if (this.preloader) this.preloader.update();
        if (this.camera) this.camera.update();
        if (this.renderer) this.renderer.update();
        if (this.world) this.world.update();
        if (this.time) this.time.update();

        window.requestAnimationFrame(() => {
            this.update();
        });
    }
}
