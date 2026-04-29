import * as THREE from "three";
import Experience from "../../Experience.js";
import { Capsule } from "three/examples/jsm/math/Capsule.js";
import nipplejs from "nipplejs";
import elements from "../../Utils/functions/elements.js";
import Avatar from "./Avatar.js";
import type { Socket } from "socket.io-client";

interface PlayerActions {
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
    run: boolean;
    jump: boolean;
    movingJoyStick: boolean;
    [key: string]: boolean;
}

interface PlayerState {
    body: THREE.PerspectiveCamera;
    animation: string;
    onFloor: boolean;
    gravity: number;
    spawn: {
        position: THREE.Vector3;
        rotation: THREE.Euler;
        velocity: THREE.Vector3;
    };
    raycaster: THREE.Raycaster;
    height: number;
    speedMultiplier: number;
    position: THREE.Vector3;
    quaternion: THREE.Euler;
    directionOffset: number;
    velocity: THREE.Vector3;
    direction: THREE.Vector3;
    collider: Capsule;
    interactionObjects?: THREE.Group;
    avatarSkin?: string;
}

interface OtherPlayer {
    id: string;
    model: Avatar;
    position: { position_x: number; position_y: number; position_z: number };
    quaternion: {
        quaternion_x: number;
        quaternion_y: number;
        quaternion_z: number;
        quaternion_w: number;
    };
    animation: { animation: string };
}

export default class Player {
    experience: Experience;
    time: Experience["time"];
    scene: THREE.Scene;
    camera: Experience["camera"];
    octree: any;
    resources: Experience["resources"];
    socket: Socket;
    domElements: Record<string, HTMLElement>;
    player!: PlayerState;
    actions!: PlayerActions;
    coords!: {
        previousX: number;
        previousY: number;
        currentX: number;
        currentY: number;
    };
    joystickVector!: THREE.Vector3;
    joystick: any;
    avatar?: Avatar;
    otherPlayers: Record<string, OtherPlayer>;
    jumpOnce: boolean;
    targetRotation: THREE.Quaternion;
    upVector: THREE.Vector3;
    currentIntersectObject: string;
    previousIntersectObject: string;
    disconnectedPlayerId?: string;

    constructor() {
        this.experience = new Experience();
        this.time = this.experience.time;
        this.scene = this.experience.scene;
        this.camera = this.experience.camera;
        this.octree = this.experience.world.octree;
        this.resources = this.experience.resources;
        this.socket = this.experience.socket;
        this.otherPlayers = {};
        this.jumpOnce = false;
        this.targetRotation = new THREE.Quaternion();
        this.upVector = new THREE.Vector3(0, 1, 0);
        this.currentIntersectObject = "";
        this.previousIntersectObject = "";

        this.domElements = elements({
            joystickArea: ".joystick-area",
            controlOverlay: ".control-overlay",
            messageInput: "#chat-message-input",
            switchViewButton: ".switch-camera-view",
        });

        this.initPlayer();
        this.initControls();
        this.setPlayerSocket();
        this.setJoyStick();
        this.addEventListeners();
    }

    initPlayer(): void {
        this.player = {} as PlayerState;
        this.player.body = this.camera.perspectiveCamera;
        this.player.animation = "idle";
        this.jumpOnce = false;
        this.player.onFloor = false;
        this.player.gravity = 60;

        this.player.spawn = {
            position: new THREE.Vector3(),
            rotation: new THREE.Euler(),
            velocity: new THREE.Vector3(),
        };

        this.player.raycaster = new THREE.Raycaster();
        this.player.raycaster.far = 5;

        this.player.height = 1.2;
        this.player.speedMultiplier = 0.35;
        this.player.position = new THREE.Vector3();
        this.player.quaternion = new THREE.Euler();
        this.player.directionOffset = 0;

        this.player.velocity = new THREE.Vector3();
        this.player.direction = new THREE.Vector3();

        this.player.collider = new Capsule(
            new THREE.Vector3(),
            new THREE.Vector3(),
            0.35,
        );

        this.socket.emit("setID");
        this.socket.emit("initPlayer", this.player);
    }

    initControls(): void {
        this.actions = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            run: false,
            jump: false,
            movingJoyStick: false,
        };

        this.coords = {
            previousX: 0,
            previousY: 0,
            currentX: 0,
            currentY: 0,
        };

        this.joystickVector = new THREE.Vector3();
    }

    setJoyStick(): void {
        const options = {
            zone: this.domElements.joystickArea,
            mode: "dynamic" as const,
        };
        this.joystick = nipplejs.create(options);

        this.joystick.on("move", (_e: any, data: any) => {
            this.actions.movingJoyStick = true;
            this.joystickVector.z = -data.vector.y;
            this.joystickVector.x = data.vector.x;
        });

        this.joystick.on("end", () => {
            this.actions.movingJoyStick = false;
        });
    }

    setPlayerSocket(): void {
        this.socket.on("setID", (_setID: string, _name: string) => {});

        this.socket.on("setAvatarSkin", (avatarSkin: string, id: string) => {
            if (!this.avatar && id === this.socket.id) {
                this.player.avatarSkin = avatarSkin;
                this.avatar = new Avatar(
                    this.resources.items[avatarSkin],
                    this.scene,
                );
                this.updatePlayerSocket();
            }
        });

        this.socket.on("playerData", (playerData: any[]) => {
            for (const player of playerData) {
                if (player.id !== this.socket.id) {
                    this.scene.traverse((child) => {
                        if (child.userData.id === player.id) {
                            return;
                        } else {
                            if (
                                !Object.prototype.hasOwnProperty.call(
                                    this.otherPlayers,
                                    player.id,
                                )
                            ) {
                                if (
                                    player.name === "" ||
                                    player.avatarSkin === ""
                                ) {
                                    return;
                                }

                                const name = player.name.substring(0, 25);

                                const newAvatar = new Avatar(
                                    this.resources.items[player.avatarSkin],
                                    this.scene,
                                    name,
                                    player.id,
                                );

                                player.model = newAvatar;
                                this.otherPlayers[player.id] = player;
                            }
                        }
                    });
                    if (this.otherPlayers[player.id]) {
                        this.otherPlayers[player.id].position = {
                            position_x: player.position_x,
                            position_y: player.position_y,
                            position_z: player.position_z,
                        };
                        this.otherPlayers[player.id].quaternion = {
                            quaternion_x: player.quaternion_x,
                            quaternion_y: player.quaternion_y,
                            quaternion_z: player.quaternion_z,
                            quaternion_w: player.quaternion_w,
                        };
                        this.otherPlayers[player.id].animation = {
                            animation: player.animation,
                        };
                    }
                }
            }
        });

        this.socket.on("removePlayer", (id: string) => {
            this.disconnectedPlayerId = id;
            const op = this.otherPlayers[id];
            if (!op) return;

            op.model.nametag.material.dispose();
            op.model.nametag.geometry.dispose();
            this.scene.remove(op.model.nametag);

            op.model.avatar.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.material.dispose();
                    child.geometry.dispose();
                }
            });

            this.scene.remove(op.model.avatar);
            delete this.otherPlayers[id];
        });
    }

    updatePlayerSocket(): void {
        setInterval(() => {
            if (this.avatar) {
                this.socket.emit("updatePlayer", {
                    position: this.avatar.avatar.position,
                    quaternion: this.avatar.avatar.quaternion,
                    animation: this.player.animation,
                    avatarSkin: this.player.avatarSkin,
                });
            }
        }, 20);
    }

    onKeyDown = (e: KeyboardEvent): void => {
        if (document.activeElement === this.domElements.messageInput) return;

        if (e.code === "KeyW" || e.code === "ArrowUp")
            this.actions.forward = true;
        if (e.code === "KeyS" || e.code === "ArrowDown")
            this.actions.backward = true;
        if (e.code === "KeyA" || e.code === "ArrowLeft")
            this.actions.left = true;
        if (e.code === "KeyD" || e.code === "ArrowRight")
            this.actions.right = true;
        if (!this.actions.run && !this.actions.jump)
            this.player.animation = "walking";
        if (e.code === "KeyO") this.player.animation = "dancing";
        if (e.code === "ShiftLeft") {
            this.actions.run = true;
            this.player.animation = "running";
        }
        if (e.code === "Space" && !this.actions.jump && this.player.onFloor) {
            this.actions.jump = true;
            this.player.animation = "jumping";
            this.jumpOnce = true;
        }
    };

    onKeyUp = (e: KeyboardEvent): void => {
        if (e.code === "KeyW" || e.code === "ArrowUp")
            this.actions.forward = false;
        if (e.code === "KeyS" || e.code === "ArrowDown")
            this.actions.backward = false;
        if (e.code === "KeyA" || e.code === "ArrowLeft")
            this.actions.left = false;
        if (e.code === "KeyD" || e.code === "ArrowRight")
            this.actions.right = false;
        if (e.code === "ShiftLeft") this.actions.run = false;

        if (this.player.onFloor) {
            if (this.actions.run) {
                this.player.animation = "running";
            } else if (
                this.actions.forward ||
                this.actions.backward ||
                this.actions.left ||
                this.actions.right
            ) {
                this.player.animation = "walking";
            } else {
                this.player.animation = "idle";
            }
        }

        if (e.code === "Space") this.actions.jump = false;
    };

    playerCollisions(): void {
        const result = this.octree.capsuleIntersect(this.player.collider);
        this.player.onFloor = false;

        if (result) {
            this.player.onFloor = result.normal.y > 0;
            this.player.collider.translate(
                result.normal.multiplyScalar(result.depth),
            );
        }
    }

    getForwardVector(): THREE.Vector3 {
        this.camera.perspectiveCamera.getWorldDirection(this.player.direction);
        this.player.direction.y = 0;
        this.player.direction.normalize();
        return this.player.direction;
    }

    getSideVector(): THREE.Vector3 {
        this.camera.perspectiveCamera.getWorldDirection(this.player.direction);
        this.player.direction.y = 0;
        this.player.direction.normalize();
        this.player.direction.cross(this.camera.perspectiveCamera.up);
        return this.player.direction;
    }

    getJoyStickDirectionalVector(): THREE.Vector3 {
        const returnVector = new THREE.Vector3();
        returnVector.copy(this.joystickVector);
        returnVector.applyQuaternion(this.camera.perspectiveCamera.quaternion);
        returnVector.y = 0;
        returnVector.multiplyScalar(1.5);
        return returnVector;
    }

    addEventListeners(): void {
        document.addEventListener("keydown", this.onKeyDown);
        document.addEventListener("keyup", this.onKeyUp);
    }

    spawnPlayerOutOfBounds(): void {
        const whitebox = this.experience.world.whiteboxScene;
        const spawnPos = whitebox
            ? whitebox.getSpawnPosition()
            : new THREE.Vector3(0, 2, 0);
        this.player.velocity = this.player.spawn.velocity;
        this.player.collider.start.copy(spawnPos);
        this.player.collider.end.copy(spawnPos);
        this.player.collider.end.y += this.player.height;
    }

    updateColliderMovement(): void {
        const speed =
            (this.player.onFloor ? 1.75 : 0.1) *
            this.player.gravity *
            this.player.speedMultiplier;
        let speedDelta = this.time.delta * speed;

        if (this.actions.movingJoyStick) {
            this.player.velocity.add(this.getJoyStickDirectionalVector());
        }
        if (this.actions.run) speedDelta *= 2.5;
        if (this.actions.forward) {
            this.player.velocity.add(
                this.getForwardVector().multiplyScalar(speedDelta),
            );
        }
        if (this.actions.backward) {
            this.player.velocity.add(
                this.getForwardVector().multiplyScalar(-speedDelta),
            );
        }
        if (this.actions.left) {
            this.player.velocity.add(
                this.getSideVector().multiplyScalar(-speedDelta),
            );
        }
        if (this.actions.right) {
            this.player.velocity.add(
                this.getSideVector().multiplyScalar(speedDelta),
            );
        }

        if (this.player.onFloor) {
            if (this.actions.jump && this.jumpOnce) this.player.velocity.y = 12;
            this.jumpOnce = false;
        }

        let damping = Math.exp(-15 * this.time.delta) - 1;

        if (!this.player.onFloor) {
            if (this.player.animation === "jumping") {
                this.player.velocity.y -=
                    this.player.gravity * 0.7 * this.time.delta;
            } else {
                this.player.velocity.y -= this.player.gravity * this.time.delta;
            }
            damping *= 0.1;
        }

        this.player.velocity.addScaledVector(this.player.velocity, damping);

        const deltaPosition = this.player.velocity
            .clone()
            .multiplyScalar(this.time.delta);
        this.player.collider.translate(deltaPosition);
        this.playerCollisions();

        this.player.body.position.sub(this.camera.controls!.target);
        this.camera.controls!.target.copy(this.player.collider.end);
        this.player.body.position.add(this.player.collider.end);
        this.player.body.updateMatrixWorld();

        if (this.player.body.position.y < -20) {
            this.spawnPlayerOutOfBounds();
        }
    }

    setInteractionObjects(interactionObjects: THREE.Group): void {
        this.player.interactionObjects = interactionObjects;
    }

    getColliderPosition(): THREE.Vector3 {
        return this.player.collider.end.clone();
    }

    getCameraLookAtDirectionalVector(): THREE.Vector3 {
        const direction = new THREE.Vector3(0, 0, -1);
        return direction.applyQuaternion(
            this.camera.perspectiveCamera.quaternion,
        );
    }

    updateRaycaster(): void {
        this.player.raycaster.ray.origin.copy(
            this.camera.perspectiveCamera.position,
        );
        this.player.raycaster.ray.direction.copy(
            this.getCameraLookAtDirectionalVector(),
        );

        const intersects = this.player.raycaster.intersectObjects(
            this.player.interactionObjects!.children,
        );

        if (intersects.length === 0) {
            this.currentIntersectObject = "";
        } else {
            this.currentIntersectObject = intersects[0].object.name;
        }

        if (this.currentIntersectObject !== this.previousIntersectObject) {
            this.previousIntersectObject = this.currentIntersectObject;
        }
    }

    updateAvatarPosition(): void {
        if (!this.avatar) return;
        this.avatar.avatar.position.copy(this.player.collider.end);
        this.avatar.avatar.position.y -= 1.56;
        this.avatar.animation.update(this.time.delta);
    }

    updateOtherPlayers(): void {
        for (const playerId in this.otherPlayers) {
            const op = this.otherPlayers[playerId];
            op.model.avatar.position.set(
                op.position.position_x,
                op.position.position_y,
                op.position.position_z,
            );
            op.model.animation.play(op.animation.animation);
            op.model.animation.update(this.time.delta);
            op.model.avatar.quaternion.set(
                op.quaternion.quaternion_x,
                op.quaternion.quaternion_y,
                op.quaternion.quaternion_z,
                op.quaternion.quaternion_w,
            );
            op.model.nametag.position.set(
                op.position.position_x,
                op.position.position_y + 2.1,
                op.position.position_z,
            );
        }
    }

    updateAvatarRotation(): void {
        if (this.actions.forward) this.player.directionOffset = Math.PI;
        if (this.actions.backward) this.player.directionOffset = 0;
        if (this.actions.left) this.player.directionOffset = -Math.PI / 2;
        if (this.actions.forward && this.actions.left)
            this.player.directionOffset = Math.PI + Math.PI / 4;
        if (this.actions.backward && this.actions.left)
            this.player.directionOffset = -Math.PI / 4;
        if (this.actions.right) this.player.directionOffset = Math.PI / 2;
        if (this.actions.forward && this.actions.right)
            this.player.directionOffset = Math.PI - Math.PI / 4;
        if (this.actions.backward && this.actions.right)
            this.player.directionOffset = Math.PI / 4;
        if (this.actions.forward && this.actions.left && this.actions.right)
            this.player.directionOffset = Math.PI;
        if (this.actions.backward && this.actions.left && this.actions.right)
            this.player.directionOffset = 0;
        if (this.actions.right && this.actions.backward && this.actions.forward)
            this.player.directionOffset = Math.PI / 2;
        if (this.actions.left && this.actions.backward && this.actions.forward)
            this.player.directionOffset = -Math.PI / 2;
    }

    updateAvatarAnimation(): void {
        if (!this.avatar) return;
        if (this.player.animation !== (this.avatar.animation as any)) {
            const a = this.actions;
            if (a.left && a.right && !a.forward && !a.backward)
                this.player.animation = "idle";
            if (!a.left && !a.right && a.forward && a.backward)
                this.player.animation = "idle";
            if (a.left && a.right && a.forward && a.backward)
                this.player.animation = "idle";
            if (!a.left && !a.right && !a.forward && !a.backward && a.run)
                this.player.animation = "idle";

            if (a.run && this.player.animation !== "jumping") {
                const moving = a.forward || a.backward || a.left || a.right;
                const cancelledH =
                    a.left && a.right && !a.forward && !a.backward;
                const cancelledV =
                    !a.left && !a.right && a.forward && a.backward;
                const cancelledAll =
                    a.left && a.right && a.forward && a.backward;

                if (moving && !cancelledH && !cancelledV && !cancelledAll) {
                    this.player.animation = "running";
                }
            }

            if (
                a.run &&
                !a.left &&
                !a.right &&
                !a.backward &&
                !a.forward &&
                a.jump
            ) {
                this.player.animation = "jumping";
            }

            if (this.player.animation === "jumping" && !this.jumpOnce) {
                if (this.player.onFloor) {
                    if (a.run) {
                        this.player.animation = "running";
                    } else if (a.forward || a.backward || a.left || a.right) {
                        this.player.animation = "walking";
                    } else {
                        this.player.animation = "idle";
                    }
                }
            }

            this.avatar.animation.play(this.player.animation);
        } else {
            this.avatar.animation.play("idle");
        }
    }

    updateCameraPosition(): void {
        if (!this.avatar) return;
        if (
            this.player.animation !== "idle" &&
            this.player.animation !== "dancing"
        ) {
            const cameraAngleFromPlayer = Math.atan2(
                this.player.body.position.x - this.avatar.avatar.position.x,
                this.player.body.position.z - this.avatar.avatar.position.z,
            );
            this.targetRotation.setFromAxisAngle(
                this.upVector,
                cameraAngleFromPlayer + this.player.directionOffset,
            );
            this.avatar.avatar.quaternion.rotateTowards(
                this.targetRotation,
                0.15,
            );
        }
    }

    update(): void {
        if (this.avatar) {
            this.updateColliderMovement();
            this.updateAvatarPosition();
            this.updateAvatarRotation();
            this.updateAvatarAnimation();
            this.updateCameraPosition();
            this.updateOtherPlayers();
        }
    }
}
