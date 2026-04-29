import * as THREE from "three";
import Experience from "./Experience.js";
import { OrbitControls } from "./Utils/CustomOrbitControls.js";

export default class Camera {
    experience: Experience;
    sizes: Experience["sizes"];
    scene: THREE.Scene;
    canvas: HTMLCanvasElement;
    params: { fov: number; aspect: number; near: number; far: number };
    controls: OrbitControls | null;
    perspectiveCamera!: THREE.PerspectiveCamera;

    constructor() {
        this.experience = new Experience();
        this.sizes = this.experience.sizes;
        this.scene = this.experience.scene;
        this.canvas = this.experience.canvas;
        this.params = {
            fov: 75,
            aspect: this.sizes.aspect,
            near: 0.1,
            far: 1000,
        };
        this.controls = null;

        this.setPerspectiveCamera();
        this.setOrbitControls();
    }

    setPerspectiveCamera(): void {
        this.perspectiveCamera = new THREE.PerspectiveCamera(
            this.params.fov,
            this.params.aspect,
            this.params.near,
            this.params.far,
        );

        this.perspectiveCamera.position.set(0, 12, 45);
        this.perspectiveCamera.rotation.y = 0;

        this.scene.add(this.perspectiveCamera);
    }

    setOrbitControls(): void {
        this.controls = new OrbitControls(this.perspectiveCamera, this.canvas);
        this.controls.enableDamping = true;
        this.controls.enablePan = false;
        this.controls.maxDistance = 6;
        this.controls.dampingFactor = 0.1;
    }

    enableOrbitControls(): void {
        if (this.controls) this.controls.enabled = true;
    }

    disableOrbitControls(): void {
        if (this.controls) this.controls.enabled = false;
    }

    onResize(): void {
        this.perspectiveCamera.aspect = this.sizes.aspect;
        this.perspectiveCamera.updateProjectionMatrix();
    }

    update(): void {
        if (!this.controls) return;
        if (this.controls.enabled === true) {
            this.controls.update();
        }
    }
}
