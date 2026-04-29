import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

/**
 * 从 docs/backlog/{active,completed,abandoned}/sprint-*.md 的 frontmatter 聚合生成 docs/STATUS.md
 */

export interface SprintFrontmatter {
    slug: string;
    status: "active" | "completed" | "abandoned";
    created: string;
    completed: string | null;
    track: string;
    owner: string;
    points_planned: number;
    points_done: number;
    summary: string;
}

export interface SprintMeta {
    frontmatter: SprintFrontmatter;
    sourcePath: string;
    fileName: string;
    /** 解析期间的非致命问题（缺字段、未知 track 等），渲染时附带 */
    warnings: string[];
}

export const KNOWN_TRACKS = [
    "gameplay",
    "experience",
    "multiplayer",
    "infra",
    "meta",
    "art",
    "tech",
    "design",
] as const;

export const TRACK_DISPLAY_NAMES: Record<string, string> = {
    gameplay: "🎮 Gameplay（玩法功能）",
    experience: "🎮 Experience（主入口引擎框架）",
    multiplayer: "🌐 Multiplayer（联机同步）",
    infra: "🔧 Infra（构建/CI/工具链）",
    meta: "🗂️ Meta（工作流/规则/文档体系）",
    art: "🎨 Art（美术资产/风格）",
    tech: "🔩 Tech（技术基建）",
    design: "📝 Design（设计文档）",
};

export interface ParsedMarkdown {
    frontmatter: Record<string, string | number | null>;
    body: string;
}

/**
 * 极简 frontmatter 解析（仅支持平 key: value，足以覆盖 ADR-004 第 2 节定义的字段）
 */
export function parseFrontmatter(content: string): ParsedMarkdown {
    const trimmed = content.replace(/^\uFEFF/, "");
    if (!trimmed.startsWith("---")) {
        return { frontmatter: {}, body: content };
    }
    const lines = trimmed.split(/\r?\n/);
    if (lines[0].trim() !== "---") {
        return { frontmatter: {}, body: content };
    }
    let endIdx = -1;
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === "---") {
            endIdx = i;
            break;
        }
    }
    if (endIdx === -1) {
        return { frontmatter: {}, body: content };
    }
    const fmLines = lines.slice(1, endIdx);
    const frontmatter: Record<string, string | number | null> = {};
    for (const raw of fmLines) {
        const line = raw.trim();
        if (!line || line.startsWith("#")) continue;
        const colonIdx = line.indexOf(":");
        if (colonIdx === -1) continue;
        const key = line.slice(0, colonIdx).trim();
        let value = line.slice(colonIdx + 1).trim();
        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }
        if (value === "null" || value === "~" || value === "") {
            frontmatter[key] = null;
        } else if (/^-?\d+$/.test(value)) {
            frontmatter[key] = parseInt(value, 10);
        } else {
            frontmatter[key] = value;
        }
    }
    const body = lines.slice(endIdx + 1).join("\n");
    return { frontmatter, body };
}

/**
 * 把 frontmatter 原始字典校验/转换为 SprintFrontmatter；
 * 缺关键字段返回 null 并把问题写入 warnings 数组（由调用方收集）。
 */
export function normalizeSprintFrontmatter(
    raw: Record<string, string | number | null>,
    warnings: string[],
): SprintFrontmatter | null {
    const requireString = (key: string): string | null => {
        const v = raw[key];
        if (typeof v === "string" && v.length > 0) return v;
        warnings.push(`missing or invalid required string field: ${key}`);
        return null;
    };
    const requireNumber = (key: string): number => {
        const v = raw[key];
        if (typeof v === "number") return v;
        warnings.push(
            `missing or invalid number field: ${key} (defaulted to 0)`,
        );
        return 0;
    };

    const slug = requireString("slug");
    const status = requireString("status");
    const created = requireString("created");
    const track = requireString("track");
    const owner = requireString("owner");
    const summary = requireString("summary");

    if (!slug || !status || !created || !track || !owner || !summary) {
        return null;
    }
    if (
        status !== "active" &&
        status !== "completed" &&
        status !== "abandoned"
    ) {
        warnings.push(`unknown status value: ${status}`);
        return null;
    }
    const completedRaw = raw["completed"];
    const completed =
        typeof completedRaw === "string" && completedRaw.length > 0
            ? completedRaw
            : null;
    if (!(KNOWN_TRACKS as readonly string[]).includes(track)) {
        warnings.push(
            `unknown track "${track}" (allowed: ${KNOWN_TRACKS.join(", ")}); rendered as-is`,
        );
    }
    return {
        slug,
        status,
        created,
        completed,
        track,
        owner,
        summary,
        points_planned: requireNumber("points_planned"),
        points_done: requireNumber("points_done"),
    };
}

export async function loadSprintFile(
    filePath: string,
): Promise<SprintMeta | null> {
    let raw: string;
    try {
        raw = await fs.readFile(filePath, "utf8");
    } catch {
        return null;
    }
    const { frontmatter } = parseFrontmatter(raw);
    if (Object.keys(frontmatter).length === 0) {
        return {
            sourcePath: filePath,
            fileName: path.basename(filePath),
            frontmatter: {
                slug: path.basename(filePath, ".md"),
                status: "completed",
                created: "????-??-??",
                completed: null,
                track: "meta",
                owner: "unknown",
                points_planned: 0,
                points_done: 0,
                summary: "(no frontmatter; treated as legacy entry)",
            },
            warnings: ["no frontmatter found; treated as legacy entry"],
        };
    }
    const warnings: string[] = [];
    const fm = normalizeSprintFrontmatter(frontmatter, warnings);
    if (!fm) {
        return {
            sourcePath: filePath,
            fileName: path.basename(filePath),
            frontmatter: {
                slug:
                    (frontmatter.slug as string | undefined) ??
                    path.basename(filePath, ".md"),
                status: "completed",
                created: "????-??-??",
                completed: null,
                track: "meta",
                owner: "unknown",
                points_planned: 0,
                points_done: 0,
                summary: "(invalid frontmatter; see warnings)",
            },
            warnings,
        };
    }
    return {
        sourcePath: filePath,
        fileName: path.basename(filePath),
        frontmatter: fm,
        warnings,
    };
}

export async function loadAllSprints(
    backlogRoot: string,
): Promise<SprintMeta[]> {
    const subdirs = ["active", "completed", "abandoned"];
    const results: SprintMeta[] = [];
    for (const sub of subdirs) {
        const dir = path.join(backlogRoot, sub);
        let entries: string[];
        try {
            entries = await fs.readdir(dir);
        } catch {
            continue;
        }
        for (const entry of entries) {
            if (!entry.startsWith("sprint-") || !entry.endsWith(".md"))
                continue;
            const meta = await loadSprintFile(path.join(dir, entry));
            if (meta) results.push(meta);
        }
    }
    return results;
}

function compareCreatedDesc(a: SprintMeta, b: SprintMeta): number {
    return b.frontmatter.created.localeCompare(a.frontmatter.created);
}

export function renderStatus(
    sprints: SprintMeta[],
    headerContent: string | null,
): string {
    const lines: string[] = [];
    lines.push("# 项目状态全景");
    lines.push("");
    lines.push(
        "> 本文件由 `npm run status:rebuild` 自动生成，**禁止手工编辑**。",
    );
    lines.push(
        "> 数据源：`docs/backlog/{active,completed,abandoned}/sprint-*.md` 的 frontmatter。",
    );
    lines.push("> 详见 `.cursor/rules/sprint-workflow.mdc`。");
    lines.push("");

    if (headerContent && headerContent.trim().length > 0) {
        lines.push(headerContent.trim());
        lines.push("");
    }

    const active = sprints
        .filter((s) => s.frontmatter.status === "active")
        .sort(compareCreatedDesc);
    const completed = sprints
        .filter((s) => s.frontmatter.status === "completed")
        .sort(compareCreatedDesc);
    const abandoned = sprints
        .filter((s) => s.frontmatter.status === "abandoned")
        .sort(compareCreatedDesc);

    lines.push("## 🟢 Active Sprint");
    lines.push("");
    if (active.length === 0) {
        lines.push("（暂无 active sprint —— 跑 `/sprint-review` 创建）");
    } else {
        const byOwner = groupBy(active, (s) => s.frontmatter.owner);
        for (const owner of Object.keys(byOwner).sort()) {
            lines.push(`### owner: \`${owner}\``);
            lines.push("");
            for (const s of byOwner[owner]) {
                lines.push(formatSprintLine(s));
            }
            lines.push("");
        }
    }

    lines.push("## 📦 Completed Sprint（按 track 分组）");
    lines.push("");
    if (completed.length === 0) {
        lines.push("（暂无 completed sprint）");
        lines.push("");
    } else {
        const byTrack = groupBy(completed, (s) => s.frontmatter.track);
        const trackOrder = orderTracks(Object.keys(byTrack));
        for (const track of trackOrder) {
            const display = TRACK_DISPLAY_NAMES[track] ?? `🏷️ ${track}`;
            lines.push(`### ${display}`);
            lines.push("");
            for (const s of byTrack[track]) {
                lines.push(formatSprintLine(s));
            }
            lines.push("");
        }
    }

    if (abandoned.length > 0) {
        lines.push("## ⚠️ Abandoned Sprint");
        lines.push("");
        for (const s of abandoned) {
            lines.push(formatSprintLine(s));
        }
        lines.push("");
    }

    const allWarnings = sprints.flatMap((s) =>
        s.warnings.map((w) => `- \`${s.fileName}\`: ${w}`),
    );
    if (allWarnings.length > 0) {
        lines.push("## 🔔 build-status 警告");
        lines.push("");
        lines.push(...allWarnings);
        lines.push("");
    }

    return (
        lines
            .join("\n")
            .replace(/\n{3,}/g, "\n\n")
            .trimEnd() + "\n"
    );
}

function formatSprintLine(s: SprintMeta): string {
    const fm = s.frontmatter;
    const completedSuffix =
        fm.status === "completed" && fm.completed
            ? ` → ${fm.completed}`
            : fm.status === "active"
              ? "（进行中）"
              : "";
    const points =
        fm.points_planned > 0
            ? ` ${fm.points_done}/${fm.points_planned}pt`
            : "";
    return `- **\`${fm.slug}\`** [${fm.track}/${fm.owner}]${points} · ${fm.created}${completedSuffix} —— ${fm.summary}`;
}

function groupBy<T, K extends string>(
    items: T[],
    keyFn: (item: T) => K,
): Record<K, T[]> {
    const out: Record<string, T[]> = {};
    for (const item of items) {
        const k = keyFn(item);
        (out[k] ??= []).push(item);
    }
    return out as Record<K, T[]>;
}

function orderTracks(tracks: string[]): string[] {
    const known = (KNOWN_TRACKS as readonly string[]).filter((t) =>
        tracks.includes(t),
    );
    const unknown = tracks.filter((t) => !known.includes(t)).sort();
    return [...known, ...unknown];
}

export interface BuildStatusOptions {
    projectRoot: string;
    /** 默认 docs/backlog */
    backlogDir?: string;
    /** 默认 docs/STATUS.md */
    outputPath?: string;
    /** 可选人类可编辑的固定头部，默认 docs/status-header.md */
    headerPath?: string;
}

export interface BuildStatusResult {
    outputPath: string;
    sprintCount: number;
    warnings: string[];
}

export async function buildStatus(
    opts: BuildStatusOptions,
): Promise<BuildStatusResult> {
    const backlogDir =
        opts.backlogDir ?? path.join(opts.projectRoot, "docs", "backlog");
    const outputPath =
        opts.outputPath ?? path.join(opts.projectRoot, "docs", "STATUS.md");
    const headerPath =
        opts.headerPath ??
        path.join(opts.projectRoot, "docs", "status-header.md");

    const sprints = await loadAllSprints(backlogDir);
    let header: string | null = null;
    try {
        header = await fs.readFile(headerPath, "utf8");
    } catch {
        header = null;
    }
    const md = renderStatus(sprints, header);
    await fs.writeFile(outputPath, md, "utf8");
    const warnings = sprints.flatMap((s) =>
        s.warnings.map((w) => `${s.fileName}: ${w}`),
    );
    return { outputPath, sprintCount: sprints.length, warnings };
}

const isCli =
    typeof process !== "undefined" &&
    typeof import.meta !== "undefined" &&
    import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}`;

const isCliWindowsAware =
    isCli ||
    (typeof process !== "undefined" &&
        process.argv[1] !== undefined &&
        fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));

if (isCliWindowsAware) {
    const projectRoot = path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        "..",
    );
    buildStatus({ projectRoot })
        .then((res) => {
            console.log(
                `[build-status] wrote ${res.outputPath} (${res.sprintCount} sprints)`,
            );
            if (res.warnings.length > 0) {
                console.warn(
                    `[build-status] ${res.warnings.length} warning(s):`,
                );
                for (const w of res.warnings) console.warn(`  - ${w}`);
            }
        })
        .catch((err) => {
            console.error("[build-status] failed:", err);
            process.exit(1);
        });
}
