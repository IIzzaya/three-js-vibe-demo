import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
    resolve: {
        alias: {
            "@experience": path.resolve(__dirname, "frontend/Experience"),
            "@utils": path.resolve(__dirname, "frontend/Experience/Utils"),
            "@world": path.resolve(__dirname, "frontend/Experience/World"),
            "@styles": path.resolve(__dirname, "frontend/styles"),
            "@server": path.resolve(__dirname, "server"),
        },
    },
    test: {
        globals: true,
        environment: "node",
        include: [
            "frontend/**/*.test.ts",
            "server/**/*.test.ts",
            "tests/unit/**/*.test.ts",
        ],
        exclude: ["node_modules", "dist", "dist-server"],
    },
});
