import { describe, it, expect, beforeEach, afterAll } from "vitest";
import fs from "fs/promises";
import os from "os";
import path from "path";

import {
    parseFrontmatter,
    normalizeSprintFrontmatter,
    loadAllSprints,
    renderStatus,
    buildStatus,
    type SprintFrontmatter,
    type SprintMeta,
} from "../../../scripts/build-status.js";

const tempRoot = path.join(
    os.tmpdir(),
    `build-status-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
);
const backlogDir = path.join(tempRoot, "docs", "backlog");

async function ensureBacklog(): Promise<void> {
    await fs.mkdir(path.join(backlogDir, "active"), { recursive: true });
    await fs.mkdir(path.join(backlogDir, "completed"), { recursive: true });
    await fs.mkdir(path.join(backlogDir, "abandoned"), { recursive: true });
}

function makeSprintMd(fm: Partial<SprintFrontmatter>, body = "body"): string {
    const lines = ["---"];
    for (const [k, v] of Object.entries(fm)) {
        if (v === null) lines.push(`${k}: null`);
        else lines.push(`${k}: ${v}`);
    }
    lines.push("---");
    lines.push("");
    lines.push(body);
    return lines.join("\n");
}

const baseFm: SprintFrontmatter = {
    slug: "260101-tester-foo",
    status: "completed",
    created: "2026-01-01",
    completed: "2026-01-05",
    track: "gameplay",
    owner: "tester",
    points_planned: 20,
    points_done: 18,
    summary: "测试用 sprint",
};

describe("parseFrontmatter", () => {
    it("解析标准 frontmatter 块", () => {
        const md = "---\nslug: hello\npoints_planned: 12\n---\n\nbody here";
        const out = parseFrontmatter(md);
        expect(out.frontmatter.slug).toBe("hello");
        expect(out.frontmatter.points_planned).toBe(12);
        expect(out.body.trim()).toBe("body here");
    });

    it("没有 frontmatter 时返回空字典", () => {
        const out = parseFrontmatter("# Just a title");
        expect(out.frontmatter).toEqual({});
        expect(out.body).toBe("# Just a title");
    });

    it("frontmatter 块未闭合时返回空字典", () => {
        const md = "---\nslug: hello\n";
        const out = parseFrontmatter(md);
        expect(out.frontmatter).toEqual({});
    });

    it("识别 null / 数字 / 字符串", () => {
        const md = '---\na: null\nb: 42\nc: hello world\nd: "quoted"\n---';
        const out = parseFrontmatter(md);
        expect(out.frontmatter.a).toBeNull();
        expect(out.frontmatter.b).toBe(42);
        expect(out.frontmatter.c).toBe("hello world");
        expect(out.frontmatter.d).toBe("quoted");
    });
});

describe("normalizeSprintFrontmatter", () => {
    it("已知 track 不警告", () => {
        const warnings: string[] = [];
        const fm = normalizeSprintFrontmatter(
            {
                slug: "x",
                status: "active",
                created: "2026-01-01",
                track: "gameplay",
                owner: "alice",
                summary: "ok",
                points_planned: 10,
                points_done: 0,
            },
            warnings,
        );
        expect(fm).not.toBeNull();
        expect(warnings).toEqual([]);
    });

    it("未知 track 警告但仍渲染", () => {
        const warnings: string[] = [];
        const fm = normalizeSprintFrontmatter(
            {
                slug: "x",
                status: "active",
                created: "2026-01-01",
                track: "newcategory",
                owner: "alice",
                summary: "ok",
                points_planned: 10,
                points_done: 0,
            },
            warnings,
        );
        expect(fm).not.toBeNull();
        expect(warnings.length).toBe(1);
        expect(warnings[0]).toContain("newcategory");
    });

    it("缺关键字段返回 null + 报警", () => {
        const warnings: string[] = [];
        const fm = normalizeSprintFrontmatter(
            { slug: "x", status: "active" },
            warnings,
        );
        expect(fm).toBeNull();
        expect(warnings.length).toBeGreaterThan(0);
    });

    it("未知 status 视为 invalid", () => {
        const warnings: string[] = [];
        const fm = normalizeSprintFrontmatter(
            {
                slug: "x",
                status: "unknownstatus",
                created: "2026-01-01",
                track: "gameplay",
                owner: "a",
                summary: "ok",
                points_planned: 1,
                points_done: 0,
            },
            warnings,
        );
        expect(fm).toBeNull();
        expect(warnings.some((w) => w.includes("unknownstatus"))).toBe(true);
    });
});

describe("loadAllSprints + buildStatus integration", () => {
    beforeEach(async () => {
        await fs.rm(tempRoot, { recursive: true, force: true });
        await ensureBacklog();
    });

    afterAll(async () => {
        await fs.rm(tempRoot, { recursive: true, force: true });
    });

    it("聚合 active + completed + abandoned 并按 track / owner 渲染", async () => {
        await fs.writeFile(
            path.join(backlogDir, "active", "sprint-260201-alice-foo.md"),
            makeSprintMd({
                ...baseFm,
                slug: "260201-alice-foo",
                status: "active",
                completed: null,
                owner: "alice",
                track: "gameplay",
                summary: "alice 在做的 gameplay sprint",
            }),
        );
        await fs.writeFile(
            path.join(backlogDir, "active", "sprint-260202-bob-bar.md"),
            makeSprintMd({
                ...baseFm,
                slug: "260202-bob-bar",
                status: "active",
                completed: null,
                owner: "bob",
                track: "art",
                summary: "bob 在做的 art sprint",
            }),
        );
        await fs.writeFile(
            path.join(backlogDir, "completed", "sprint-260101-x-old.md"),
            makeSprintMd({
                ...baseFm,
                slug: "260101-x-old",
                status: "completed",
                track: "gameplay",
                owner: "alice",
                summary: "已完成 gameplay sprint",
            }),
        );
        await fs.writeFile(
            path.join(backlogDir, "abandoned", "sprint-260105-y-bad.md"),
            makeSprintMd({
                ...baseFm,
                slug: "260105-y-bad",
                status: "abandoned",
                track: "infra",
                owner: "alice",
                summary: "放弃的 infra 想法",
            }),
        );

        const sprints = await loadAllSprints(backlogDir);
        expect(sprints).toHaveLength(4);

        const md = renderStatus(sprints, null);
        expect(md).toContain("## 🟢 Active Sprint");
        expect(md).toContain("260201-alice-foo");
        expect(md).toContain("260202-bob-bar");
        expect(md).toContain("260101-x-old");
        expect(md).toContain("260105-y-bad");
        expect(md).toContain("Gameplay");
        expect(md).toContain("[art/bob]");
        expect(md).toContain("⚠️ Abandoned Sprint");
        expect(md).toContain("owner: `alice`");
        expect(md).toContain("owner: `bob`");
    });

    it("buildStatus 写出文件并返回 sprint 数 + 警告", async () => {
        await fs.writeFile(
            path.join(backlogDir, "completed", "sprint-260101-tester-bad.md"),
            makeSprintMd({
                ...baseFm,
                slug: "260101-tester-bad",
                track: "weirdcategory",
            }),
        );
        const outFile = path.join(tempRoot, "docs", "STATUS.md");
        const res = await buildStatus({
            projectRoot: tempRoot,
            backlogDir,
            outputPath: outFile,
            headerPath: path.join(tempRoot, "nonexistent-header.md"),
        });
        expect(res.sprintCount).toBe(1);
        expect(res.warnings.length).toBeGreaterThan(0);
        const written = await fs.readFile(outFile, "utf8");
        expect(written).toContain("260101-tester-bad");
        expect(written).toContain("自动生成");
    });

    it("缺 frontmatter 的 legacy 文件作为 legacy entry 渲染并附警告", async () => {
        await fs.writeFile(
            path.join(backlogDir, "completed", "sprint-legacy.md"),
            "# Legacy sprint without frontmatter\n",
        );
        const sprints = await loadAllSprints(backlogDir);
        expect(sprints).toHaveLength(1);
        expect(sprints[0].warnings[0]).toContain("no frontmatter");
        expect(sprints[0].frontmatter.slug).toBe("sprint-legacy");
    });

    it("可选 status-header.md 存在时被插入到生成的 STATUS 顶部", async () => {
        await fs.writeFile(
            path.join(backlogDir, "completed", "sprint-260101-tester-foo.md"),
            makeSprintMd(baseFm),
        );
        const headerFile = path.join(tempRoot, "docs", "status-header.md");
        await fs.mkdir(path.dirname(headerFile), { recursive: true });
        await fs.writeFile(headerFile, "## 项目概要\n\n固定头部内容。\n");

        const outFile = path.join(tempRoot, "docs", "STATUS.md");
        await buildStatus({
            projectRoot: tempRoot,
            backlogDir,
            outputPath: outFile,
            headerPath: headerFile,
        });
        const written = await fs.readFile(outFile, "utf8");
        expect(written).toContain("固定头部内容。");
    });

    it("空 backlog 也能跑（active 显示空提示）", async () => {
        const md = renderStatus([], null);
        expect(md).toContain("暂无 active sprint");
    });
});

describe("renderStatus track ordering", () => {
    it("已知 track 按声明顺序排，未知 track 字母序在后", () => {
        const sprints: SprintMeta[] = ["zzz", "gameplay", "infra", "aaa"].map(
            (track) => ({
                sourcePath: `mock/${track}.md`,
                fileName: `${track}.md`,
                warnings: [],
                frontmatter: {
                    ...baseFm,
                    slug: `s-${track}`,
                    track,
                    summary: `track ${track}`,
                },
            }),
        );
        const md = renderStatus(sprints, null);
        const gameplayIdx = md.indexOf("track gameplay");
        const infraIdx = md.indexOf("track infra");
        const aaaIdx = md.indexOf("track aaa");
        const zzzIdx = md.indexOf("track zzz");
        expect(gameplayIdx).toBeLessThan(infraIdx);
        expect(infraIdx).toBeLessThan(aaaIdx);
        expect(aaaIdx).toBeLessThan(zzzIdx);
    });
});
