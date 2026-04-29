import { describe, it, expect, afterAll, beforeAll } from "vitest";
import {
    launchHarness,
    driveUIFlowToInGame,
    type Harness,
} from "./PuppeteerHarness.js";

const BACKEND_PORT = parseInt(process.env.E2E_BACKEND_PORT ?? "3061", 10);
const FRONTEND_PORT = parseInt(process.env.E2E_FRONTEND_PORT ?? "4261", 10);

describe("whitebox multiplayer sync smoke", () => {
    let harness: Harness;

    beforeAll(async () => {
        harness = await launchHarness({
            backendPort: BACKEND_PORT,
            frontendPort: FRONTEND_PORT,
        });
    }, 60_000);

    afterAll(async () => {
        if (harness) await harness.close();
    }, 30_000);

    it("two pages connect to the same backend and each reaches the whitebox", async () => {
        const pageA = harness.page;
        const wrappedB = await harness.openPage();
        const pageB = wrappedB.page;

        await pageA.goto(`${harness.baseUrl}/?seed=1`, {
            waitUntil: "domcontentloaded",
        });
        await pageB.goto(`${harness.baseUrl}/?seed=2`, {
            waitUntil: "domcontentloaded",
        });

        const [flowA, flowB] = await Promise.all([
            driveUIFlowToInGame(pageA, {
                botName: "Alpha",
                maxWaitMs: 45_000,
            }),
            driveUIFlowToInGame(pageB, {
                botName: "Bravo",
                maxWaitMs: 45_000,
            }),
        ]);

        if (!flowA.ok) {
            // eslint-disable-next-line no-console
            console.error(
                `[E2E] pageA flow failed at stage '${flowA.stage}'. Page errors:\n${harness.pageErrors.join("\n")}\nConsole (last 30):\n${harness.pageConsole.slice(-30).join("\n")}`,
            );
        }
        if (!flowB.ok) {
            // eslint-disable-next-line no-console
            console.error(
                `[E2E] pageB flow failed at stage '${flowB.stage}'. Page errors:\n${wrappedB.pageErrors.join("\n")}\nConsole (last 30):\n${wrappedB.pageConsole.slice(-30).join("\n")}`,
            );
        }

        expect(flowA.ok).toBe(true);
        expect(flowB.ok).toBe(true);
    }, 120_000);
});
