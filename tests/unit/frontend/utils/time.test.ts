import { describe, it, expect, beforeEach, vi } from "vitest";
import Time from "../../../../frontend/Experience/Utils/Time.js";

describe("Time", () => {
    let time: Time;

    beforeEach(() => {
        time = new Time();
    });

    it("should initialize with correct defaults", () => {
        expect(time.delta).toBeCloseTo(0.016, 3);
        expect(time.rawDelta).toBeCloseTo(0.016, 3);
        expect(time.elapsed).toBe(0);
        expect(time.gameSeconds).toBe(0);
        expect(time.timeScale).toBe(1);
        expect(time.start).toBeGreaterThan(0);
        expect(time.current).toBe(time.start);
    });

    it("should compute delta on update", () => {
        const now = Date.now();
        time.current = now;
        vi.spyOn(Date, "now").mockReturnValue(now + 16);
        time.update();
        expect(time.delta).toBeCloseTo(0.016, 2);
        vi.restoreAllMocks();
    });

    it("should clamp huge raw gaps to 1 second", () => {
        const now = Date.now();
        time.current = now;
        vi.spyOn(Date, "now").mockReturnValue(now + 100000);
        time.update();
        expect(time.rawDelta).toBe(1);
        expect(time.delta).toBe(1);
        vi.restoreAllMocks();
    });

    it("should return delta via getDelta()", () => {
        expect(time.getDelta()).toBe(time.delta);
    });

    it("should apply timeScale to delta but not rawDelta", () => {
        time.setTimeScale(4);
        const now = Date.now();
        time.current = now;
        vi.spyOn(Date, "now").mockReturnValue(now + 50);
        time.update();
        expect(time.rawDelta).toBeCloseTo(0.05, 3);
        expect(time.delta).toBeCloseTo(0.2, 3);
        vi.restoreAllMocks();
    });

    it("should accumulate scaled gameSeconds independently of rawDelta", () => {
        time.setTimeScale(2);
        const now = Date.now();
        time.current = now;
        const spy = vi.spyOn(Date, "now");
        spy.mockReturnValue(now + 100);
        time.update();
        spy.mockReturnValue(now + 300);
        time.update();
        expect(time.elapsed).toBeCloseTo(0.3, 3);
        expect(time.gameSeconds).toBeCloseTo(0.6, 3);
        vi.restoreAllMocks();
    });

    it("should clamp timeScale to [0.1, 4] via setTimeScale", () => {
        time.setTimeScale(100);
        expect(time.timeScale).toBe(4);
        time.setTimeScale(0);
        expect(time.timeScale).toBe(0.1);
        time.setTimeScale(2);
        expect(time.timeScale).toBe(2);
    });

    it("should return previous timeScale from setTimeScale", () => {
        expect(time.setTimeScale(2)).toBe(1);
        expect(time.setTimeScale(3)).toBe(2);
    });
});
