const fs = require("fs");
const path = require("path");

function getExecutablePath() {
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        return process.env.PUPPETEER_EXECUTABLE_PATH;
    }

    const candidates = [];

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

const executablePath = getExecutablePath();

module.exports = {
    executablePath,
    chrome: {
        skipDownload: true,
    },
    "chrome-headless-shell": {
        skipDownload: true,
    },
    firefox: {
        skipDownload: true,
    },
};
