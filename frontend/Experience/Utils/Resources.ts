import Loaders from "./Loaders.js";
import { EventEmitter } from "events";
import * as THREE from "three";
import type { AssetDefinition, AssetGroup } from "./assets.js";

interface ResourceLoadError {
    asset: AssetDefinition;
    message: string;
}

export default class Resources extends EventEmitter {
    items: Record<string, any>;
    assets: AssetGroup[];
    location: string;
    loaders: ReturnType<typeof Loaders.prototype.setLoaders> extends void
        ? any
        : any;
    loaded: number;
    queue: number;
    video: Record<string, HTMLVideoElement>;
    videoTexture: Record<string, THREE.VideoTexture>;
    errors: ResourceLoadError[];

    constructor(assets: AssetGroup[]) {
        super();

        this.items = {};
        this.assets = assets;
        this.location = this.resolveLocation();
        this.loaded = 0;
        this.queue = 0;
        this.video = {};
        this.videoTexture = {};
        this.errors = [];

        this.loaders = new Loaders().loaders;

        this.startLoading();
    }

    resolveLocation(): string {
        const firstGroup = this.assets[0];
        if (!firstGroup) {
            return "";
        }

        const [location] = Object.keys(firstGroup);
        return location || "";
    }

    getAssetList(): AssetDefinition[] {
        if (!this.location) {
            return [];
        }

        return this.assets[0]?.[this.location]?.assets ?? [];
    }

    startLoading(): void {
        const assetsToLoad = this.getAssetList();
        this.loaded = 0;
        this.errors = [];
        this.queue = assetsToLoad.length;

        if (this.queue === 0) {
            this.emit("loading", 0, 0);
            this.emit("ready");
            return;
        }

        for (const asset of assetsToLoad) {
            if (asset.type === "glbModel") {
                this.loaders.gltfLoader.load(
                    asset.path as string,
                    (file: any) => {
                        this.singleAssetLoaded(asset, file);
                    },
                    undefined,
                    (error: unknown) => {
                        this.singleAssetFailed(asset, error);
                    },
                );
            } else if (asset.type === "imageTexture") {
                this.loaders.textureLoader.load(
                    asset.path as string,
                    (file: any) => {
                        this.singleAssetLoaded(asset, file);
                    },
                    undefined,
                    (error: unknown) => {
                        this.singleAssetFailed(asset, error);
                    },
                );
            } else if (asset.type === "cubeTexture") {
                this.loaders.cubeTextureLoader.load(
                    asset.path as string[],
                    (file: any) => {
                        this.singleAssetLoaded(asset, file);
                    },
                    undefined,
                    (error: unknown) => {
                        this.singleAssetFailed(asset, error);
                    },
                );
            } else if (asset.type === "videoTexture") {
                this.video[asset.name] = document.createElement("video");
                this.video[asset.name].src = asset.path as string;
                this.video[asset.name].muted = true;
                this.video[asset.name].playsInline = true;
                this.video[asset.name].autoplay = true;
                this.video[asset.name].loop = true;
                void this.video[asset.name].play().catch(() => {
                    // Muted autoplay can still be blocked in some environments.
                });

                this.videoTexture[asset.name] = new THREE.VideoTexture(
                    this.video[asset.name],
                );
                this.videoTexture[asset.name].flipY = false;
                this.videoTexture[asset.name].minFilter = THREE.NearestFilter;
                this.videoTexture[asset.name].magFilter = THREE.NearestFilter;
                this.videoTexture[asset.name].generateMipmaps = false;
                this.videoTexture[asset.name].colorSpace = THREE.SRGBColorSpace;

                this.singleAssetLoaded(asset, this.videoTexture[asset.name]);
            }
        }
    }

    singleAssetLoaded(asset: AssetDefinition, file: any): void {
        this.items[asset.name] = file;
        this.markAssetComplete();
    }

    singleAssetFailed(asset: AssetDefinition, error: unknown): void {
        const message =
            error instanceof Error ? error.message : "Unknown asset load error";

        this.errors.push({ asset, message });
        this.emit("load-error", {
            assetName: asset.name,
            path: asset.path,
            message,
        });
        this.markAssetComplete();
    }

    markAssetComplete(): void {
        this.loaded++;
        this.emit("loading", this.loaded, this.queue);

        if (this.loaded === this.queue) {
            if (this.errors.length > 0) {
                this.emit("failed", [...this.errors]);
                return;
            }

            this.emit("ready");
        }
    }
}
