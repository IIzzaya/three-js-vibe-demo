import { execSync } from "child_process";

const PORTS = [3000, 5173];
const isWindows = process.platform === "win32";

function findAndKillWindows(port) {
    const output = execSync(
        `netstat -ano | findstr :${port} | findstr LISTENING`,
        { encoding: "utf8" },
    );

    const pids = [
        ...new Set(
            output
                .trim()
                .split("\n")
                .map((line) => line.trim().split(/\s+/).pop())
                .filter((pid) => pid && pid !== "0"),
        ),
    ];

    for (const pid of pids) {
        try {
            execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
            console.log(`Killed PID ${pid} on port ${port}`);
        } catch {
            // process may have already exited
        }
    }
}

function findAndKillUnix(port) {
    const output = execSync(`lsof -ti :${port}`, { encoding: "utf8" });

    const pids = [
        ...new Set(output.trim().split("\n").filter(Boolean)),
    ];

    for (const pid of pids) {
        try {
            execSync(`kill -9 ${pid}`, { stdio: "ignore" });
            console.log(`Killed PID ${pid} on port ${port}`);
        } catch {
            // process may have already exited
        }
    }
}

for (const port of PORTS) {
    try {
        if (isWindows) {
            findAndKillWindows(port);
        } else {
            findAndKillUnix(port);
        }
    } catch {
        console.log(`Port ${port} is free`);
    }
}
