import { describe, it, expect, afterAll } from "vitest";
import http from "http";
import express from "express";
import { Server as SocketIOServer } from "socket.io";
import { io as ioClient, type Socket as ClientSocket } from "socket.io-client";
import { registerChatNamespace } from "../../server/sockets/chat.js";
import { registerUpdateNamespace } from "../../server/sockets/update.js";

describe("Server Smoke Tests", () => {
    let httpServer: http.Server;
    let io: SocketIOServer;
    let port: number;

    const startServer = (): Promise<void> => {
        return new Promise((resolve) => {
            const app = express();
            httpServer = http.createServer(app);
            io = new SocketIOServer(httpServer, {
                cors: { origin: "*", methods: "*" },
            });

            app.get("/health", (_req, res) => {
                res.json({ status: "ok" });
            });

            registerChatNamespace(io);
            registerUpdateNamespace(io);

            httpServer.listen(0, () => {
                const addr = httpServer.address();
                port = typeof addr === "object" && addr ? addr.port : 0;
                resolve();
            });
        });
    };

    afterAll(() => {
        return new Promise<void>((resolve) => {
            if (io) io.close();
            if (httpServer) httpServer.close(() => resolve());
            else resolve();
        });
    });

    it("should start server and respond to HTTP", async () => {
        await startServer();

        const res = await fetch(`http://localhost:${port}/health`);
        const data = await res.json();
        expect(data.status).toBe("ok");
    });

    it("should accept chat socket connection", async () => {
        const chatSocket: ClientSocket = ioClient(
            `http://localhost:${port}/chat`,
            { transports: ["websocket"] },
        );

        await new Promise<void>((resolve, reject) => {
            chatSocket.on("connect", () => resolve());
            chatSocket.on("connect_error", reject);
            setTimeout(
                () => reject(new Error("Chat connection timeout")),
                5000,
            );
        });

        expect(chatSocket.connected).toBe(true);
        chatSocket.disconnect();
    });

    it("should accept update socket connection", async () => {
        const updateSocket: ClientSocket = ioClient(
            `http://localhost:${port}/update`,
            { transports: ["websocket"] },
        );

        await new Promise<void>((resolve, reject) => {
            updateSocket.on("connect", () => resolve());
            updateSocket.on("connect_error", reject);
            setTimeout(
                () => reject(new Error("Update connection timeout")),
                5000,
            );
        });

        expect(updateSocket.connected).toBe(true);
        updateSocket.disconnect();
    });

    it("should broadcast chat messages", async () => {
        const sender: ClientSocket = ioClient(`http://localhost:${port}/chat`, {
            transports: ["websocket"],
        });
        const receiver: ClientSocket = ioClient(
            `http://localhost:${port}/chat`,
            { transports: ["websocket"] },
        );

        await Promise.all([
            new Promise<void>((resolve) => sender.on("connect", resolve)),
            new Promise<void>((resolve) => receiver.on("connect", resolve)),
        ]);

        sender.emit("setName", "TestUser");

        const messagePromise = new Promise<{
            name: string;
            message: string;
            time: string;
        }>((resolve) => {
            receiver.on(
                "received-message",
                (name: string, message: string, time: string) => {
                    resolve({ name, message, time });
                },
            );
        });

        await new Promise((r) => setTimeout(r, 100));

        sender.emit("send-message", "Hello World", "12:00");

        const received = await messagePromise;
        expect(received.name).toBe("TestUser");
        expect(received.message).toBe("Hello World");
        expect(received.time).toBe("12:00");

        sender.disconnect();
        receiver.disconnect();
    });
});
