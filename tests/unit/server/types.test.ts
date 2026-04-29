import { describe, it, expect } from "vitest";
import type {
    Vector3Data,
    QuaternionData,
    PlayerUserData,
    PlayerBroadcastData,
    ChatUserData,
} from "../../../server/types.js";

describe("Server Types", () => {
    it("should allow creating a valid Vector3Data", () => {
        const v: Vector3Data = { x: 1, y: 2, z: 3 };
        expect(v.x).toBe(1);
        expect(v.y).toBe(2);
        expect(v.z).toBe(3);
    });

    it("should allow creating a valid QuaternionData", () => {
        const q: QuaternionData = { x: 0, y: 0, z: 0, w: 1 };
        expect(q.w).toBe(1);
    });

    it("should allow creating a valid PlayerUserData", () => {
        const p: PlayerUserData = {
            position: { x: 0, y: 0, z: 0 },
            quaternion: { x: 0, y: 0, z: 0, w: 1 },
            animation: "idle",
            name: "test",
            avatarSkin: "placeholder-character",
        };
        expect(p.name).toBe("test");
        expect(p.animation).toBe("idle");
    });

    it("should allow creating a valid PlayerBroadcastData", () => {
        const d: PlayerBroadcastData = {
            id: "socket-id",
            name: "player1",
            position_x: 0,
            position_y: 0,
            position_z: 0,
            quaternion_x: 0,
            quaternion_y: 0,
            quaternion_z: 0,
            quaternion_w: 1,
            animation: "idle",
            avatarSkin: "placeholder-character",
        };
        expect(d.id).toBe("socket-id");
    });

    it("should allow creating a valid ChatUserData", () => {
        const c: ChatUserData = { name: "user1" };
        expect(c.name).toBe("user1");
    });
});
