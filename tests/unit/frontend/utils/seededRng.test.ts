import { describe, it, expect } from "vitest";
import {
    mulberry32,
    deriveSeed,
    generateRandomSeed,
} from "../../../../frontend/Experience/Utils/SeededRng.js";

describe("SeededRng", () => {
    describe("mulberry32", () => {
        it("returns values in [0, 1)", () => {
            const rng = mulberry32(12345);
            for (let i = 0; i < 100; i++) {
                const v = rng();
                expect(v).toBeGreaterThanOrEqual(0);
                expect(v).toBeLessThan(1);
            }
        });

        it("is deterministic for the same seed", () => {
            const a = mulberry32(42);
            const b = mulberry32(42);
            for (let i = 0; i < 50; i++) {
                expect(a()).toBe(b());
            }
        });

        it("produces different sequences for different seeds", () => {
            const a = mulberry32(1);
            const b = mulberry32(2);
            const aFirst = Array.from({ length: 10 }, () => a());
            const bFirst = Array.from({ length: 10 }, () => b());
            expect(aFirst).not.toEqual(bFirst);
        });
    });

    describe("deriveSeed", () => {
        it("is deterministic", () => {
            const a = deriveSeed(42, "waves");
            const b = deriveSeed(42, "waves");
            expect(a).toBe(b);
        });

        it("produces different values for different labels", () => {
            const waves = deriveSeed(42, "waves");
            const map = deriveSeed(42, "map");
            const obj = deriveSeed(42, "objectives");
            expect(waves).not.toBe(map);
            expect(waves).not.toBe(obj);
            expect(map).not.toBe(obj);
        });

        it("produces different values for different parents", () => {
            expect(deriveSeed(1, "waves")).not.toBe(deriveSeed(2, "waves"));
        });
    });

    describe("generateRandomSeed", () => {
        it("returns a finite 32-bit integer", () => {
            for (let i = 0; i < 10; i++) {
                const s = generateRandomSeed();
                expect(Number.isFinite(s)).toBe(true);
                expect(Number.isInteger(s)).toBe(true);
                expect(Math.abs(s)).toBeLessThanOrEqual(0x7fffffff);
            }
        });
    });
});
