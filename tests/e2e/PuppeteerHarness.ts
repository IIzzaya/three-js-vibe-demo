/**
 * Puppeteer + Vite dev server + minimal-GLB harness shared by E2E and smoke
 * tests. Encapsulates the boilerplate of:
 *
 *   - launching a stub backend (socket.io for /chat + /update)
 *   - starting a Vite dev server with proxy
 *   - launching headless Chromium with SwiftShader WebGL
 *   - stubbing GLB assets so we don't need to ship real models
 *   - opening one or more Puppeteer pages against the same backend (for
 *     multi-bot multiplayer-sync smoke tests)
 *
 * Keep this module dependency-light and side-effect free so it can be
 * reused by `tests/e2e/*.test.ts` and `tests/smoke/*.test.ts`.
 */
import { createServer, type ViteDevServer } from "vite";
import puppeteer, { type Browser, type Page } from "puppeteer";
import path from "path";
import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import { registerChatNamespace } from "../../server/sockets/chat.js";
import { registerUpdateNamespace } from "../../server/sockets/update.js";
import { createPuppeteerLaunchOptions } from "./puppeteerLaunch.js";

export interface HarnessConfig {
    backendPort: number;
    frontendPort: number;
    /** If true, launches Puppeteer in headful mode for debugging. */
    headful?: boolean;
}

export interface HarnessPage {
    page: Page;
    pageErrors: string[];
    pageConsole: string[];
}

export interface Harness {
    browser: Browser;
    /** First page, opened eagerly. Additional pages via `openPage()` (shares
     *  the same browser — background tabs may be throttled). For multi-bot
     *  scenarios use `openBrowserPage()` to spawn a fresh browser per bot. */
    page: Page;
    pageErrors: string[];
    pageConsole: string[];
    viteServer: ViteDevServer;
    backendServer: http.Server;
    io: SocketIOServer;
    baseUrl: string;
    openPage(): Promise<HarnessPage>;
    /** Spawn a new Browser and return its first wired page. Needed for
     *  multi-bot playtest where each bot must tick its own rAF independently. */
    openBrowserPage(): Promise<HarnessPage & { browser: Browser }>;
    close(): Promise<void>;
}

/**
 * Build a minimal valid GLB containing a Root node and 6 named empty
 * animations (dance / idle / jump / run / walk / wave) — matches the slot
 * order Avatar.setAnimation() expects. Sufficient for boot-and-render
 * smoke tests without shipping a real rigged model.
 */
export function buildMinimalGLB(): Buffer {
    const json = JSON.stringify({
        asset: { version: "2.0" },
        scene: 0,
        scenes: [{ nodes: [0] }],
        nodes: [{ name: "Root" }],
        animations: [
            { channels: [], samplers: [], name: "dance" },
            { channels: [], samplers: [], name: "idle" },
            { channels: [], samplers: [], name: "jump" },
            { channels: [], samplers: [], name: "run" },
            { channels: [], samplers: [], name: "walk" },
            { channels: [], samplers: [], name: "wave" },
        ],
    });
    const pad = (4 - (json.length % 4)) % 4;
    const jsonPadded = json + " ".repeat(pad);
    const jsonLen = Buffer.byteLength(jsonPadded, "utf8");
    const total = 12 + 8 + jsonLen;
    const buf = Buffer.alloc(total);
    buf.writeUInt32LE(0x46546c67, 0);
    buf.writeUInt32LE(2, 4);
    buf.writeUInt32LE(total, 8);
    buf.writeUInt32LE(jsonLen, 12);
    buf.writeUInt32LE(0x4e4f534a, 16);
    buf.write(jsonPadded, 20, "utf8");
    return buf;
}

export async function launchHarness(config: HarnessConfig): Promise<Harness> {
    const app = express();
    const backendServer = http.createServer(app);
    const io = new SocketIOServer(backendServer, {
        cors: { origin: "*", methods: "*" },
    });

    registerChatNamespace(io);
    registerUpdateNamespace(io);

    await new Promise<void>((resolve) => {
        backendServer.listen(config.backendPort, "127.0.0.1", () => resolve());
    });

    const viteServer = await createServer({
        configFile: path.resolve(process.cwd(), "vite.config.ts"),
        server: {
            host: "127.0.0.1",
            port: config.frontendPort,
            strictPort: true,
            proxy: {
                "/socket.io": {
                    target: `http://127.0.0.1:${config.backendPort}`,
                    ws: true,
                },
            },
        },
        logLevel: "error",
    });
    await viteServer.listen();
    const baseUrl = `http://127.0.0.1:${config.frontendPort}`;

    const puppeteerArgs = [
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--enable-webgl",
        "--ignore-gpu-blocklist",
        "--use-gl=angle",
        "--use-angle=swiftshader-webgl",
        "--enable-unsafe-swiftshader",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
    ];

    const browser = await puppeteer.launch(
        createPuppeteerLaunchOptions(!!config.headful, puppeteerArgs),
    );

    const extraBrowsers: Browser[] = [];

    const minimalGLB = buildMinimalGLB();

    async function wirePage(p: Page): Promise<HarnessPage> {
        p.setDefaultTimeout(45000);
        const pageErrors: string[] = [];
        const pageConsole: string[] = [];
        p.on("pageerror", (err) => pageErrors.push(err.message));
        p.on("console", (msg) =>
            pageConsole.push(`[${msg.type()}] ${msg.text()}`),
        );

        // Force-visible document so Chrome's background-tab throttling doesn't
        // pause rAF for non-foreground pages. Critical for multi-bot playtest
        // where multiple pages tick their own game loop in parallel.
        await p.evaluateOnNewDocument(() => {
            Object.defineProperty(document, "visibilityState", {
                get: () => "visible",
                configurable: true,
            });
            Object.defineProperty(document, "hidden", {
                get: () => false,
                configurable: true,
            });
        });

        await p.evaluateOnNewDocument(() => {
            const origGetContext = HTMLCanvasElement.prototype.getContext;
            HTMLCanvasElement.prototype.getContext = function (
                type: string,
                ...args: unknown[]
            ) {
                const result = (
                    origGetContext as unknown as (
                        t: string,
                        ...a: unknown[]
                    ) => unknown
                ).call(this, type, ...args);
                if (result) return result;
                if (type === "webgl" || type === "webgl2") {
                    return (
                        origGetContext as unknown as (
                            t: string,
                            ...a: unknown[]
                        ) => unknown
                    ).call(this, "webgl", {
                        failIfMajorPerformanceCaveat: false,
                    });
                }
                return result;
            } as never;
        });

        await p.setRequestInterception(true);
        p.on("request", (req) => {
            if (req.url().includes(".glb")) {
                void req.respond({
                    status: 200,
                    contentType: "application/octet-stream",
                    body: minimalGLB,
                });
            } else {
                void req.continue();
            }
        });

        return { page: p, pageErrors, pageConsole };
    }

    const firstPage = await browser.newPage();
    const wrappedFirst = await wirePage(firstPage);

    return {
        browser,
        page: wrappedFirst.page,
        pageErrors: wrappedFirst.pageErrors,
        pageConsole: wrappedFirst.pageConsole,
        viteServer,
        backendServer,
        io,
        baseUrl,
        async openPage(): Promise<HarnessPage> {
            const p = await browser.newPage();
            return wirePage(p);
        },
        async openBrowserPage(): Promise<HarnessPage & { browser: Browser }> {
            const b = await puppeteer.launch(
                createPuppeteerLaunchOptions(!!config.headful, puppeteerArgs),
            );
            extraBrowsers.push(b);
            const p = await b.newPage();
            const wrapped = await wirePage(p);
            return { ...wrapped, browser: b };
        },
        async close(): Promise<void> {
            try {
                await browser.close();
            } catch {
                /* ignore */
            }
            for (const b of extraBrowsers) {
                try {
                    await b.close();
                } catch {
                    /* ignore */
                }
            }
            try {
                await viteServer.close();
            } catch {
                /* ignore */
            }
            await new Promise<void>((resolve) => {
                io.close();
                backendServer.close(() => resolve());
            });
        },
    };
}

/**
 * Drive the name-entry UI into the whitebox scene. Just fills
 * the name input and clicks the Enter button. Returns once the world is
 * ready (debugBus `world:ready` event observed) or throws on timeout.
 */
export async function driveUIFlowToInGame(
    page: Page,
    options: { botName?: string; maxWaitMs?: number } = {},
): Promise<{ ok: boolean; stage: string }> {
    const botName = options.botName ?? "AutoBot";
    const maxWait = options.maxWaitMs ?? 40000;
    const driver = `
        return new Promise((resolve) => {
            const start = Date.now();
            const timeout = () => Date.now() - start > maxWait;

            const waitForWorldReady = () => {
                if (timeout()) return resolve({ ok: false, stage: "world-ready" });
                const gm = window.GM;
                const hist = gm && gm.debugHistory ? gm.debugHistory("world") : [];
                const ready = hist.some(e => e.action === "ready");
                if (ready) {
                    performNameEntry();
                    return;
                }
                setTimeout(waitForWorldReady, 200);
            };

            const performNameEntry = () => {
                if (timeout()) return resolve({ ok: false, stage: "name-entry" });
                const btn = document.querySelector("#name-input-button");
                const input = document.querySelector("#name-input");
                if (!btn || !input) {
                    setTimeout(performNameEntry, 200);
                    return;
                }
                input.value = botName;
                input.dispatchEvent(new Event("input", { bubbles: true }));
                btn.click();
                setTimeout(verifyInGame, 400);
            };

            const verifyInGame = () => {
                if (timeout()) return resolve({ ok: false, stage: "in-game" });
                const gm = window.GM;
                const hist = gm && gm.debugHistory ? gm.debugHistory("ui") : [];
                const entered = hist.some(e => e.action === "name-entered");
                if (entered) {
                    resolve({ ok: true, stage: "in-game" });
                    return;
                }
                setTimeout(verifyInGame, 200);
            };

            waitForWorldReady();
        });
    `;
    return page.evaluate(
        `(async () => { const botName = ${JSON.stringify(botName)}; const maxWait = ${maxWait}; ${driver} })()`,
    ) as unknown as Promise<{ ok: boolean; stage: string }>;
}
