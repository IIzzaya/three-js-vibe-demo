import * as THREE from "three";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";
import Nametag from "./Nametag.js";

export interface AvatarAnimation {
    mixer: THREE.AnimationMixer;
    actions: Record<string, THREE.AnimationAction> & {
        current: THREE.AnimationAction;
    };
    play: (name: string) => void;
    update: (time: number) => void;
}

export default class Avatar {
    scene: THREE.Scene;
    name: Nametag;
    nametag: THREE.Sprite;
    avatar: THREE.Object3D & { animations?: THREE.AnimationClip[] };
    animation!: AvatarAnimation;
    speedAdjustment: number;

    constructor(
        avatarData: any,
        scene: THREE.Scene,
        name = "Anonymous",
        id?: string,
    ) {
        this.scene = scene;
        this.name = new Nametag();
        this.nametag = this.name.createNametag(16, 150, name);
        this.avatar = SkeletonUtils.clone(avatarData.scene);
        this.avatar.userData.id = id;
        this.speedAdjustment = 1;

        (this.avatar as any).animations = avatarData.animations.map(
            (clip: THREE.AnimationClip) => clip.clone(),
        );

        this.setAvatar();
    }

    setAvatar(): void {
        this.avatar.scale.set(0.99, 0.99, 0.99);
        this.setAnimation();
        this.scene.add(this.avatar);

        if (this.avatar.userData.id) {
            this.scene.add(this.nametag);
        }
    }

    setAnimation(): void {
        const animations = (this.avatar as any)
            .animations as THREE.AnimationClip[];
        this.animation = {} as AvatarAnimation;

        this.animation.mixer = new THREE.AnimationMixer(this.avatar);
        this.animation.actions = {} as any;

        this.animation.actions.dancing = this.animation.mixer.clipAction(
            animations[0],
        );
        this.animation.actions.idle = this.animation.mixer.clipAction(
            animations[1],
        );
        this.animation.actions.jumping = this.animation.mixer.clipAction(
            animations[2],
        );
        this.animation.actions.running = this.animation.mixer.clipAction(
            animations[3],
        );
        this.animation.actions.walking = this.animation.mixer.clipAction(
            animations[4],
        );
        this.animation.actions.waving = this.animation.mixer.clipAction(
            animations[5],
        );

        this.animation.actions.current = this.animation.actions.idle;
        this.animation.actions.current.play();

        this.animation.play = (name: string) => {
            const newAction = this.animation.actions[name];
            const oldAction = this.animation.actions.current;

            if (oldAction === newAction) return;

            if (this.animation.actions.current === ("jumping" as any)) {
                this.speedAdjustment = 1.5;
            } else {
                this.speedAdjustment = 1.0;
            }

            newAction.reset();
            newAction.play();
            newAction.crossFadeFrom(oldAction, 0.2);

            this.animation.actions.current = newAction;
        };

        this.animation.update = (time: number) => {
            this.animation.mixer.update(time * this.speedAdjustment);
        };
    }
}
