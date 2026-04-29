import { describe, it, expect } from "vitest";
import { config } from "../../../server/config.js";

describe("Server Config", () => {
    it("should have a valid default port", () => {
        expect(config.port).toBe(3000);
    });

    it("should have CORS configured", () => {
        expect(config.cors.origin).toBe("*");
        expect(config.cors.methods).toBe("*");
    });

    it("should have a valid update interval", () => {
        expect(config.updateInterval).toBe(20);
        expect(config.updateInterval).toBeGreaterThan(0);
    });
});
