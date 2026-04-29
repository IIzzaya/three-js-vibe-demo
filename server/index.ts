import express from "express";
import path from "path";
import http from "http";
import { Server } from "socket.io";
import { config } from "./config.js";
import { registerChatNamespace } from "./sockets/chat.js";
import { registerUpdateNamespace } from "./sockets/update.js";

const app = express();
const server = http.createServer(app);
const io: Server = new Server(server, {
    cors: config.cors,
});

app.use(express.static("dist"));

const indexPath = path.join(process.cwd(), "dist", "index.html");

app.get("*", (_req, res) => {
    res.sendFile(indexPath);
});

registerChatNamespace(io);
registerUpdateNamespace(io);

server.listen(config.port, () => {
    console.log(`Server listening on port ${config.port}`);
});

function shutdown() {
    console.log("\nShutting down server...");
    io.close();
    server.close(() => {
        console.log("Server closed.");
        process.exit(0);
    });
    setTimeout(() => process.exit(1), 5000);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

export { app, server, io };
