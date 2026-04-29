import { describe, it, expect } from "vitest";
import lerp from "../../../../frontend/Experience/Utils/functions/lerp.js";

describe("lerp", () => {
    it("should return start when factor is 0", () => {
        expect(lerp(0, 10, 0)).toBe(0);
    });

    it("should return end when factor is 1", () => {
        expect(lerp(0, 10, 1)).toBe(10);
    });

    it("should return midpoint when factor is 0.5", () => {
        expect(lerp(0, 10, 0.5)).toBe(5);
    });

    it("should interpolate negative values", () => {
        expect(lerp(-10, 10, 0.5)).toBe(0);
    });

    it("should handle equal start and end", () => {
        expect(lerp(5, 5, 0.5)).toBe(5);
    });

    it("should extrapolate when factor > 1", () => {
        expect(lerp(0, 10, 2)).toBe(20);
    });
});
