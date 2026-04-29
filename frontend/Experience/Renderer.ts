import * as THREE from "three";
import Experience from "./Experience.js";

export default class Renderer {
    experience: Experience;
    sizes: Experience["sizes"];
    scene: THREE.Scene;
    canvas: HTMLCanvasElement;
    camera: Experience["camera"];
    renderer!: THREE.WebGLRenderer;

    constructor() {
        this.experience = new Experience();
        this.sizes = this.experience.sizes;
        this.scene = this.experience.scene;
        this.canvas = this.experience.canvas;
        this.camera = this.experience.camera;

        this.setRenderer();
    }

    setRenderer(): void {
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            logarithmicDepthBuffer: true,
        });
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.CineonToneMapping;
        this.renderer.toneMappingExposure = 1.5;
        this.renderer.setSize(this.sizes.width, this.sizes.height);
        this.renderer.setPixelRatio(this.sizes.pixelRatio);
    }

    onResize(): void {
        this.renderer.setSize(this.sizes.width, this.sizes.height);
        this.renderer.setPixelRatio(this.sizes.pixelRatio);
    }

    update(): void {
        this.renderer.render(this.scene, this.camera.perspectiveCamera);
    }
}
