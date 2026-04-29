import { EventEmitter } from "events";
import Experience from "../Experience.js";
import { Octree } from "three/examples/jsm/math/Octree.js";
import Player from "./Player/Player.js";
import WhiteboxScene from "./WhiteboxScene.js";
import { getSeed, lockSeed } from "../Utils/RunContext.js";

/**
 * World — 白盒世界装配入口
 *
 * 只负责把白盒场景和玩家装配起来。
 * 新游戏玩法加入时在此处扩展（新增 Systems、替换 WhiteboxScene 为真实关卡等）。
 */
export default class World extends EventEmitter {
    experience: Experience;
    resources: Experience["resources"];
    octree: Octree;
    player: Player | null;
    whiteboxScene?: WhiteboxScene;

    constructor() {
        super();
        this.experience = new Experience();
        this.resources = this.experience.resources;
        this.octree = new Octree();
        this.player = null;

        this.resources.on("ready", () => {
            if (this.player !== null) return;

            const sessionSeed = getSeed();
            lockSeed();
            this.experience.debugBus.emit("sim", "seed-set", {
                seed: sessionSeed,
                appliedAt: "world-init",
            });

            this.whiteboxScene = new WhiteboxScene();
            this.octree.fromGraphNode(this.whiteboxScene.collisionGroup);

            this.player = new Player();

            this.experience.debugBus.emit("world", "ready", {
                seed: sessionSeed,
                spawn: this.whiteboxScene.getSpawnPosition().toArray(),
            });
        });
    }

    update(): void {
        if (this.player) this.player.update();
    }
}
