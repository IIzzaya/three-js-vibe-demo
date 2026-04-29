import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AssetGroup } from "../../../../frontend/Experience/Utils/assets.js";

const gltfLoad = vi.fn();
const textureLoad = vi.fn();
const cubeTextureLoad = vi.fn();

vi.mock("../../../../frontend/Experience/Utils/Loaders.js", () => ({
    default: class MockLoaders {
        loaders = {
            gltfLoader: { load: gltfLoad },
            textureLoader: { load: textureLoad },
            cubeTextureLoader: { load: cubeTextureLoad },
            dracoLoader: {},
        };
    },
}));

describe("Resources", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("loads assets from the first manifest location instead of a hardcoded group", async () => {
        gltfLoad.mockImplementation((_path, onLoad) => {
            setTimeout(() => onLoad({ scene: {} }), 0);
        });
        textureLoad.mockImplementation((_path, onLoad) => {
            setTimeout(() => onLoad({ image: {} }), 0);
        });

        const { default: Resources } =
            await import("../../../../frontend/Experience/Utils/Resources.js");

        const assets: AssetGroup[] = [
            {
                core: {
                    assets: [
                        {
                            name: "male",
                            type: "glbModel",
                            path: "/models/male.glb",
                        },
                        {
                            name: "terrain",
                            type: "imageTexture",
                            path: "/textures/terrain.png",
                        },
                    ],
                },
            },
        ];

        const resources = new Resources(assets);
        const loadingEvents: Array<{ loaded: number; queue: number }> = [];

        resources.on("loading", (loaded: number, queue: number) => {
            loadingEvents.push({ loaded, queue });
        });

        await new Promise<void>((resolve) => {
            resources.on("ready", () => resolve());
        });

        expect(resources.location).toBe("core");
        expect(resources.items.male).toBeDefined();
        expect(resources.items.terrain).toBeDefined();
        expect(loadingEvents).toEqual([
            { loaded: 1, queue: 2 },
            { loaded: 2, queue: 2 },
        ]);
    });

    it("emits a failed event instead of hanging forever when an asset load errors", async () => {
        gltfLoad.mockImplementation((_path, _onLoad, _onProgress, onError) => {
            setTimeout(() => onError?.(new Error("missing model")), 0);
        });
        textureLoad.mockImplementation((_path, onLoad) => {
            setTimeout(() => onLoad({ image: {} }), 0);
        });

        const { default: Resources } =
            await import("../../../../frontend/Experience/Utils/Resources.js");

        const assets: AssetGroup[] = [
            {
                core: {
                    assets: [
                        {
                            name: "male",
                            type: "glbModel",
                            path: "/models/male.glb",
                        },
                        {
                            name: "terrain",
                            type: "imageTexture",
                            path: "/textures/terrain.png",
                        },
                    ],
                },
            },
        ];

        const resources = new Resources(assets);
        const readySpy = vi.fn();
        const assetErrorSpy = vi.fn();

        resources.on("ready", readySpy);
        resources.on("load-error", assetErrorSpy);

        const failures = await new Promise<
            Array<{
                asset: { name: string; path: string | string[] };
                message: string;
            }>
        >((resolve) => {
            resources.on("failed", (errors) => resolve(errors));
        });

        expect(readySpy).not.toHaveBeenCalled();
        expect(assetErrorSpy).toHaveBeenCalledWith({
            assetName: "male",
            path: "/models/male.glb",
            message: "missing model",
        });
        expect(failures).toHaveLength(1);
        expect(failures[0]?.asset.name).toBe("male");
        expect(resources.loaded).toBe(2);
    });
});
