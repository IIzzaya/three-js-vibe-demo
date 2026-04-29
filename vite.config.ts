import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
    root: "frontend",
    publicDir: "../public",
    resolve: {
        alias: {
            "@experience": path.resolve(__dirname, "frontend/Experience"),
            "@utils": path.resolve(__dirname, "frontend/Experience/Utils"),
            "@world": path.resolve(__dirname, "frontend/Experience/World"),
            "@styles": path.resolve(__dirname, "frontend/styles"),
        },
    },
    build: {
        outDir: "../dist",
        emptyOutDir: true,
        chunkSizeWarningLimit: 1600,
        rollupOptions: {
            input: {
                main: path.resolve(__dirname, "frontend/index.html"),
            },
            output: {
                manualChunks(id) {
                    if (id.includes("node_modules")) {
                        return id
                            .toString()
                            .split("node_modules/")[1]
                            .split("/")[0]
                            .toString();
                    }
                },
            },
        },
    },
    server: {
        proxy: {
            "/socket.io": {
                target: "http://localhost:3000",
                ws: true,
            },
        },
    },
    css: {
        preprocessorOptions: {
            scss: {
                silenceDeprecations: ["legacy-js-api", "if-function"],
            },
        },
    },
    optimizeDeps: {
        include: ["socket.io-client"],
    },
});
