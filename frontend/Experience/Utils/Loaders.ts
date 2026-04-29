import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

export interface LoaderSet {
    cubeTextureLoader: THREE.CubeTextureLoader;
    gltfLoader: GLTFLoader;
    dracoLoader: DRACOLoader;
    textureLoader: THREE.TextureLoader;
}

export default class Loaders {
    loaders: LoaderSet;

    constructor() {
        this.loaders = {} as LoaderSet;
        this.setLoaders();
    }

    setLoaders(): void {
        this.loaders.cubeTextureLoader = new THREE.CubeTextureLoader();
        this.loaders.gltfLoader = new GLTFLoader();
        this.loaders.dracoLoader = new DRACOLoader();
        this.loaders.dracoLoader.setDecoderPath("/draco/");
        this.loaders.gltfLoader.setDRACOLoader(this.loaders.dracoLoader);
        this.loaders.textureLoader = new THREE.TextureLoader();
    }
}
