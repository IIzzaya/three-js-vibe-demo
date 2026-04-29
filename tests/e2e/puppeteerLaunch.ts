import fs from "node:fs";
import path from "node:path";
import puppeteer, { type LaunchOptions } from "puppeteer";

function findSystemChrome(): string | undefined {
    const candidates: string[] = [];

    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        candidates.push(process.env.PUPPETEER_EXECUTABLE_PATH);
    }

    if (process.platform === "win32") {
        candidates.push(
            path.join(
                process.env.ProgramFiles || "C:\\Program Files",
                "Google",
                "Chrome",
                "Application",
                "chrome.exe",
            ),
            path.join(
                process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)",
                "Google",
                "Chrome",
                "Application",
                "chrome.exe",
            ),
            path.join(
                process.env.LOCALAPPDATA ||
                    path.join(
                        process.env.USERPROFILE || "C:\\Users\\Default",
                        "AppData",
                        "Local",
                    ),
                "Google",
                "Chrome",
                "Application",
                "chrome.exe",
            ),
        );
    } else if (process.platform === "darwin") {
        candidates.push(
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            path.join(
                process.env.HOME || "",
                "Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            ),
        );
    } else {
        candidates.push(
            "/usr/bin/google-chrome-stable",
            "/usr/bin/google-chrome",
            "/usr/bin/chromium-browser",
            "/usr/bin/chromium",
        );
    }

    return candidates.find((candidate) => fs.existsSync(candidate));
}

function findManagedBrowser(): string | undefined {
    try {
        const executablePath = puppeteer.executablePath();
        return fs.existsSync(executablePath) ? executablePath : undefined;
    } catch {
        return undefined;
    }
}

export function createPuppeteerLaunchOptions(
    headful: boolean,
    args: string[],
): LaunchOptions {
    const executablePath = findSystemChrome() ?? findManagedBrowser();

    if (!executablePath) {
        throw new Error(
            "未找到可用的 Chrome/Chromium。请先运行 `npm run browser:install`，或设置 `PUPPETEER_EXECUTABLE_PATH` 指向本机浏览器。",
        );
    }

    return {
        headless: !headful,
        args,
        executablePath,
    };
}
