import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
    resolve: {
        alias: {
            "@server": path.resolve(__dirname, "server"),
        },
    },
    test: {
        globals: true,
        environment: "node",
        include: ["tests/smoke/**/*.test.ts"],
        testTimeout: 60000,
        hookTimeout: 60000,
    },
});
