# Agent Guide

> 本文件是 AI agent 的 **项目全景 & 架构理解** 文档——读一次就能理解项目。
> 日常编码规则（代码风格、Shell 环境、Git 格式等）在 `.cursor/rules/global.mdc`。

## 项目概览
本项目是一个基于 Three.js（WebGL）+ Socket.IO 的 **3D 多人联网游戏模板**，采用 **AI 驱动 vibe coding** 开发模式。人类作为游戏制作人，AI agent 自主实现。

默认入口（`/`）是一个完整可运行的白盒场景——WASD 移动、多人位置同步、聊天系统——作为任何多人 3D 网页游戏的起跑线。

## 开发模式
本项目采用 **AI 驱动 Sprint 工作流**（多制作人并行版）：
1. AI 按 `docs/backlog/active/sprint-{slug}.md` 自动执行任务（每位制作人各自一个 active sprint）
2. 人类制作人在 Sprint 完成后统一验收并给方向
3. `docs/` 下的设计文档是共享的 source of truth
4. `docs/STATUS.md` 由 `npm run status:rebuild` 从所有 sprint frontmatter 自动聚合，**禁止手工编辑**

**开始任何开发任务前，先读 `docs/STATUS.md`。**

### 核心工作流（4 个 Cursor Skill）
| Skill | 用途 |
|-------|------|
| `/discuss-next` | AI 探索下一步开发方向，帮制作人找灵感 |
| `/game-design` | 讨论并记录游戏设计决策 |
| `/sprint-review` | 制作人验收 Sprint → 生成下一个 Sprint |
| `/sprint-execute` | AI 自动执行当前 Sprint 所有任务（Sprint 收尾时自动跑 e2e + smoke + 归档，不自动 push）|

### Sprint 执行流
```
AI 读 active/sprint-{slug}.md → 挑最高优先级任务 → 实现 + 测试 →
commit (${owner}-ai 身份) → 更新看板 → 下一个任务 → Sprint 完成 →
test:e2e + test:smoke → git mv 到 completed/ → npm run status:rebuild → npm run dev → 等制作人验收
```

## 技术栈
| 层 | 技术 |
|----|------|
| 前端 | TypeScript、Three.js、Vite、SCSS、GSAP |
| 后端 | TypeScript、Express、Socket.IO、Node.js |
| 测试 | Vitest（unit + smoke + E2E Puppeteer）|
| 调试 | DebugBus（事件总线）+ GM 指令（`window.GM`）|
| Lint | ESLint + Prettier + Husky + lint-staged |
| CI | GitHub Actions |
| 部署 | `npm run dev`（本地开发）/ Dockerfile（通用容器镜像）|

## 目录结构
```
project/
├── docs/                      # 游戏设计 + 项目管理
│   ├── STATUS.md              # 项目全景（AI 必读，自动生成）
│   ├── status-header.md       # STATUS.md 固定头部（手工编辑）
│   ├── game-design/           # 游戏设计文档
│   ├── art-direction/         # 美术风格
│   ├── technical/adr/         # 架构决策记录
│   ├── milestones/            # 阶段目标
│   ├── backlog/               # 看板（Sprint 任务）
│   │   ├── active/            # 进行中 sprint（每位制作人各 1 个）
│   │   ├── completed/         # 已完成 sprint（含验收报告）
│   │   ├── abandoned/         # 已放弃 sprint
│   │   ├── ideas/             # 待孵化的想法（slug.md）
│   │   └── templates/         # 模板
├── frontend/                  # Vite 前端
│   ├── index.html             # `/` 默认入口 —— 白盒多人联机场景
│   ├── main.ts                # 应用 bootstrap（socket.io + Experience + chat）
│   ├── Experience/            # Three.js 核心
│   │   ├── Experience.ts      # 单例 —— scene / camera / renderer / 循环
│   │   ├── Camera.ts / Renderer.ts / Preloader.ts
│   │   ├── Debug/             # DebugBus + GM
│   │   ├── Utils/             # Sizes / Time / Resources / Loaders / SeededRng / RunContext
│   │   └── World/             # WhiteboxScene / Assets / Player
│   └── styles/                # SCSS
├── server/                    # Express + Socket.IO
│   ├── index.ts / config.ts / types.ts
│   └── sockets/               # /chat + /update 命名空间
├── public/                    # 静态资源（models / textures / fonts）
├── scripts/                   # build-status / kill-ports
├── tests/                     # unit / smoke / e2e
├── .cursor/                   # rules + skills + mcp.json
└── .github/workflows/         # CI
```

## 架构与数据流

### Experience 单例
`frontend/Experience/Experience.ts` 是 Three.js 核心单例，管理 scene / camera / renderer / debugBus / gm。所有模块从单例获取共享状态。

### 调试基建
所有新功能**必须**注册：
1. **DebugBus 事件**——结构化事件，让 AI 不看画面也能验证状态
2. **GM 指令**——程序化入口，让 AI 可以注入 / 查询状态

```typescript
this.debugBus.emit("player", "move", { from: [0,0,0], to: [1,0,0] });
this.gm.register("teleport", "Teleport player to position", (x, y, z) => { ... });
```

### 数据流
```
Resources（资源加载）→ "ready" → World 初始化 WhiteboxScene + Player
Sizes（viewport）→ "resize" → Camera + Renderer resize
Time.update() → 每帧 delta → Player 物理 / 动画
Socket.IO /update → 20ms 广播 → 多人同步
DebugBus → console log + 历史事件 → AI 测试
```

## Git Commit 政策
- AI agent **必须**在完成代码变更后自动 commit，不要等用户催
- 文档工作（game-design / backlog 等）同样要及时 commit；`docs/STATUS.md` 由 `npm run status:rebuild` 重建，不要手工编辑
- AI commit 身份格式：`${owner}-ai`（owner 取自 `.env` 的 `PROJECT_OWNER`，缺失则阻断）
- Sprint 任务 commit message 格式：`sprint-{slug} T{n}: {desc}`
- Sprint 收尾时 AI 只做本地 rebase / 测试 / 归档 / commit，不自动 push；远端发布由制作人手动完成
- 具体 commit 格式、Shell 注意事项、rebase 协议详见 `.cursor/rules/global.mdc`

## 常用命令
| 命令 | 用途 |
|---|---|
| `npm run dev` | 前端 + 后端 concurrent 本地起 |
| `npm run build` | 构建前端到 `dist/` |
| `npm start` | 生产环境起服 |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm run lint` / `format` | ESLint / Prettier |
| `npm test` | 单元测试 |
| `npm run test:smoke` / `test:e2e` | Smoke / E2E 测试 |
| `npm run status:rebuild` | 从所有 sprint frontmatter 重建 `docs/STATUS.md` |
| `docker compose up --build` | Docker 容器运行（可选）|
