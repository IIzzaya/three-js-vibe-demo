import * as THREE from "three";
import Experience from "../Experience.js";

/**
 * WhiteboxScene — 多人 3D 框架的白盒场景
 *
 * 提供最小 3D 多人联网玩法验证环境：
 * - 带网格纹理的大平地（Octree 碰撞地面）
 * - 3 个不同颜色的参考立方体（空间定位锚 + 碰撞测试对象）
 * - cubemap skybox（`public/textures/environment/`）
 * - 基础光照（环境光 + 方向光）
 *
 * 新游戏玩法加入后会替换本类为实际关卡/场景，但在白盒阶段
 * 它是 Player 移动 / 多人同步的稳定地基。
 */
export default class WhiteboxScene {
    experience: Experience;
    scene: THREE.Scene;
    collisionGroup: THREE.Group;
    spawnPosition: THREE.Vector3;

    constructor() {
        this.experience = new Experience();
        this.scene = this.experience.scene;
        this.collisionGroup = new THREE.Group();
        this.collisionGroup.name = "whitebox-collision";
        this.spawnPosition = new THREE.Vector3(0, 2, 0);

        this.setLights();
        this.setSkybox();
        this.setGround();
        this.setReferenceCubes();

        this.scene.add(this.collisionGroup);

        this.experience.debugBus.emit("whitebox", "scene-ready", {
            spawn: this.spawnPosition.toArray(),
            referenceCubes: 3,
            groundSize: 200,
        });
    }

    getSpawnPosition(): THREE.Vector3 {
        return this.spawnPosition.clone();
    }

    private setLights(): void {
        const ambient = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambient);

        const sun = new THREE.DirectionalLight(0xffffff, 0.9);
        sun.position.set(30, 50, 20);
        this.scene.add(sun);
    }

    private setSkybox(): void {
        const loader = new THREE.CubeTextureLoader();
        loader.setPath("/textures/environment/");
        const cube = loader.load(
            ["px.png", "nx.png", "py.png", "ny.png", "pz.png", "nz.png"],
            undefined,
            undefined,
            (err) => {
                console.warn(
                    "[whitebox] skybox load failed, fallback to solid sky",
                    err,
                );
                this.scene.background = new THREE.Color(0x87ceeb);
            },
        );
        this.scene.background = cube;
    }

    private setGround(): void {
        const size = 200;
        const geom = new THREE.PlaneGeometry(size, size);
        geom.rotateX(-Math.PI / 2);

        const gridTexture = this.makeGridTexture(size);
        gridTexture.wrapS = THREE.RepeatWrapping;
        gridTexture.wrapT = THREE.RepeatWrapping;
        gridTexture.repeat.set(1, 1);

        const mat = new THREE.MeshStandardMaterial({
            map: gridTexture,
            roughness: 0.95,
            metalness: 0.0,
        });

        const ground = new THREE.Mesh(geom, mat);
        ground.name = "whitebox-ground";
        ground.receiveShadow = true;
        this.collisionGroup.add(ground);
    }

    /**
     * Generate a checker-grid canvas texture so the ground is visually
     * measurable — movement distance is immediately readable by eye,
     * which is the entire point of a whitebox.
     */
    private makeGridTexture(worldSize: number): THREE.CanvasTexture {
        const cellPx = 32;
        const cellsPerSide = worldSize;
        const canvasSize = cellPx * 8;

        const canvas = document.createElement("canvas");
        canvas.width = canvasSize;
        canvas.height = canvasSize;
        const ctx = canvas.getContext("2d")!;

        ctx.fillStyle = "#c8c8c8";
        ctx.fillRect(0, 0, canvasSize, canvasSize);

        ctx.strokeStyle = "#8a8a8a";
        ctx.lineWidth = 2;
        for (let i = 0; i <= 8; i++) {
            const p = i * cellPx;
            ctx.beginPath();
            ctx.moveTo(p, 0);
            ctx.lineTo(p, canvasSize);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, p);
            ctx.lineTo(canvasSize, p);
            ctx.stroke();
        }

        const tex = new THREE.CanvasTexture(canvas);
        tex.anisotropy = 8;
        tex.repeat.set(cellsPerSide / 8, cellsPerSide / 8);
        return tex;
    }

    private setReferenceCubes(): void {
        const specs: Array<{
            color: number;
            position: [number, number, number];
        }> = [
            { color: 0xff4444, position: [10, 1, 0] },
            { color: 0x44ff44, position: [-10, 1, 0] },
            { color: 0x4488ff, position: [0, 1, 10] },
        ];

        for (const s of specs) {
            const box = new THREE.Mesh(
                new THREE.BoxGeometry(2, 2, 2),
                new THREE.MeshStandardMaterial({ color: s.color }),
            );
            box.position.set(...s.position);
            box.name = `whitebox-ref-${s.color.toString(16)}`;
            this.collisionGroup.add(box);
        }
    }
}
