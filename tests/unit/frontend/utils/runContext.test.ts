import { describe, it, expect, beforeEach } from "vitest";
import {
    initRunContextFromURL,
    getSeed,
    setSeed,
    isSeedExplicit,
    lockSeed,
    isSeedLocked,
    getTimeScale,
    setTimeScale,
    clampTimeScale,
    __resetForTests,
    MIN_TIME_SCALE,
    MAX_TIME_SCALE,
} from "../../../../frontend/Experience/Utils/RunContext.js";

function setLocation(search: string): void {
    // jsdom provides window.location; we assign search via `Object.defineProperty`
    // because jsdom's location is a special URL object.
    const url = new URL(`http://localhost/${search}`);
    Object.defineProperty(globalThis, "location", {
        configurable: true,
        value: { search: url.search },
    });
}

describe("RunContext", () => {
    beforeEach(() => {
        __resetForTests();
        setLocation("");
    });

    describe("clampTimeScale", () => {
        it("clamps above max", () => {
            expect(clampTimeScale(100)).toBe(MAX_TIME_SCALE);
        });
        it("clamps below min", () => {
            expect(clampTimeScale(0.001)).toBe(MIN_TIME_SCALE);
        });
        it("returns 1 for non-finite values", () => {
            expect(clampTimeScale(NaN)).toBe(1);
            expect(clampTimeScale(Infinity)).toBe(1);
            expect(clampTimeScale(-Infinity)).toBe(1);
        });
        it("passes through valid values", () => {
            expect(clampTimeScale(2)).toBe(2);
            expect(clampTimeScale(0.5)).toBe(0.5);
        });
    });

    describe("initRunContextFromURL", () => {
        it("generates a random seed when none specified", () => {
            initRunContextFromURL(true);
            expect(isSeedExplicit()).toBe(false);
            expect(Number.isFinite(getSeed())).toBe(true);
        });

        it("reads seed from URL when present", () => {
            setLocation("?seed=42");
            initRunContextFromURL(true);
            expect(getSeed()).toBe(42);
            expect(isSeedExplicit()).toBe(true);
        });

        it("reads timeScale from URL and clamps", () => {
            setLocation("?timeScale=3");
            initRunContextFromURL(true);
            expect(getTimeScale()).toBe(3);

            setLocation("?timeScale=100");
            initRunContextFromURL(true);
            expect(getTimeScale()).toBe(MAX_TIME_SCALE);
        });

        it("combines seed + timeScale params", () => {
            setLocation("?seed=7&timeScale=2");
            initRunContextFromURL(true);
            expect(getSeed()).toBe(7);
            expect(getTimeScale()).toBe(2);
        });
    });

    describe("setSeed / lockSeed", () => {
        it("succeeds before lock", () => {
            initRunContextFromURL(true);
            expect(setSeed(999)).toBe(true);
            expect(getSeed()).toBe(999);
        });

        it("fails after lock", () => {
            initRunContextFromURL(true);
            lockSeed();
            expect(isSeedLocked()).toBe(true);
            expect(setSeed(999)).toBe(false);
        });

        it("rejects non-finite", () => {
            initRunContextFromURL(true);
            expect(setSeed(NaN)).toBe(false);
        });
    });

    describe("setTimeScale", () => {
        it("clamps and returns new value", () => {
            initRunContextFromURL(true);
            expect(setTimeScale(10)).toBe(MAX_TIME_SCALE);
            expect(getTimeScale()).toBe(MAX_TIME_SCALE);
        });
    });
});
