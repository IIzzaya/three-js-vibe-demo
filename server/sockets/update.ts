import type { Server, Socket } from "socket.io";
import { config } from "../config.js";
import type {
    PlayerUserData,
    PlayerUpdatePayload,
    PlayerBroadcastData,
} from "../types.js";

export function registerUpdateNamespace(io: Server): void {
    const updateNameSpace = io.of("/update");
    const connectedSockets = new Map<string, Socket>();

    updateNameSpace.on("connection", (socket) => {
        const userData: PlayerUserData = {
            position: { x: 0, y: -500, z: -500 },
            quaternion: { x: 0, y: 0, z: 0, w: 0 },
            animation: "idle",
            name: "",
            avatarSkin: "",
        };
        (socket as any).userData = userData;
        connectedSockets.set(socket.id, socket);

        console.log(`${socket.id} has connected to update namespace`);

        socket.on("setID", () => {
            updateNameSpace.emit("setID", socket.id);
        });

        socket.on("setName", (name: string) => {
            (socket as any).userData.name = name;
        });

        socket.on("setAvatar", (avatarSkin: string) => {
            updateNameSpace.emit("setAvatarSkin", avatarSkin, socket.id);
        });

        socket.on("disconnect", () => {
            console.log(`${socket.id} has disconnected`);
            connectedSockets.delete(socket.id);
            updateNameSpace.emit("removePlayer", socket.id);
        });

        socket.on("initPlayer", (_player: unknown) => {
            // reserved for future initialization logic
        });

        socket.on("updatePlayer", (player: PlayerUpdatePayload) => {
            const ud = (socket as any).userData as PlayerUserData;
            ud.position.x = player.position.x;
            ud.position.y = player.position.y;
            ud.position.z = player.position.z;
            ud.quaternion.x = player.quaternion[0];
            ud.quaternion.y = player.quaternion[1];
            ud.quaternion.z = player.quaternion[2];
            ud.quaternion.w = player.quaternion[3];
            ud.animation = player.animation;
            ud.avatarSkin = player.avatarSkin;
        });

        setInterval(() => {
            const ud = (socket as any).userData as PlayerUserData;
            if (ud.name === "" || ud.avatarSkin === "") {
                return;
            }

            const playerData: PlayerBroadcastData[] = [];
            for (const s of connectedSockets.values()) {
                const sud = (s as any).userData as PlayerUserData;
                if (sud.name !== "" && sud.avatarSkin !== "") {
                    playerData.push({
                        id: s.id,
                        name: sud.name,
                        position_x: sud.position.x,
                        position_y: sud.position.y,
                        position_z: sud.position.z,
                        quaternion_x: sud.quaternion.x,
                        quaternion_y: sud.quaternion.y,
                        quaternion_z: sud.quaternion.z,
                        quaternion_w: sud.quaternion.w,
                        animation: sud.animation,
                        avatarSkin: sud.avatarSkin,
                    });
                }
            }

            updateNameSpace.emit("playerData", playerData);
        }, config.updateInterval);
    });
}
