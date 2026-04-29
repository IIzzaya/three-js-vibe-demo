import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchHarness, type Harness } from "../e2e/PuppeteerHarness.js";
import type { Page } from "puppeteer";

const BACKEND_PORT = parseInt(process.env.SMOKE_BACKEND_PORT ?? "3051", 10);
const FRONTEND_PORT = parseInt(process.env.SMOKE_FRONTEND_PORT ?? "4251", 10);

describe("Startup Smoke Tests", () => {
    let harness: Harness;
    let page: Page;

    beforeAll(async () => {
        harness = await launchHarness({
            backendPort: BACKEND_PORT,
            frontendPort: FRONTEND_PORT,
        });
        page = harness.page;
    }, 60_000);

    afterAll(async () => {
        if (harness) await harness.close();
    }, 30_000);

    it("renders the startup shell and advances loading progress", async () => {
        await page.goto(`${harness.baseUrl}/`, {
            waitUntil: "domcontentloaded",
        });
        await page.waitForSelector(".preloader");

        expect(await page.title()).toBe("three-js-vibe-demo");

        const startupBadge = await page.$eval(
            ".startup-badge",
            (element) => element.textContent?.trim() ?? "",
        );
        const startupTitle = await page.$eval(
            ".preloader-title",
            (element) => element.textContent?.trim() ?? "",
        );
        const welcomeTitle = await page.$eval(
            ".welcome-title",
            (element) => element.textContent?.trim() ?? "",
        );

        expect(startupBadge).toBe("three-js-vibe-demo");
        expect(startupTitle).toBe("Loading");
        expect(welcomeTitle).toBe("Enter your name");

        await page.waitForFunction(
            () => {
                const pb = document.querySelector<HTMLElement>(".progress-bar");
                if (!pb) return false;
                const w = pb.style.width;
                return w !== "" && w !== "0%";
            },
            { timeout: 30_000 },
        );
    }, 60_000);
});
