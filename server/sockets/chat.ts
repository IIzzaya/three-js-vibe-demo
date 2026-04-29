import type { Server } from "socket.io";
import type { ChatUserData } from "../types.js";

export function registerChatNamespace(io: Server): void {
    const chatNameSpace = io.of("/chat");

    chatNameSpace.on("connection", (socket) => {
        (socket as any).userData = { name: "" } satisfies ChatUserData;

        console.log(`${socket.id} has connected to chat namespace`);

        socket.on("disconnect", () => {
            console.log(`${socket.id} has disconnected`);
        });

        socket.on("setName", (name: string) => {
            (socket as any).userData.name = name;
        });

        socket.on("send-message", (message: string, time: string) => {
            socket.broadcast.emit(
                "received-message",
                (socket as any).userData.name,
                message,
                time,
            );
        });
    });
}
