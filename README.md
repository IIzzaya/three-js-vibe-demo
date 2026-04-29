# three-js-vibe-demo

一个基于 Three.js + Express + Socket.IO 的 3D 多人联网游戏基础框架，面向 AI vibe coding 工作流。

默认入口提供可运行的白盒场景：进入场景、姓名输入、WASD 移动、多人位置同步和聊天。它不是一个已经定型的游戏，而是用于快速孵化多人 3D 网页游戏的起跑线。

## 项目定位

本仓库把“可运行游戏模板”和“AI 协作流程”放在同一个工程里：

- **白盒多人场景**：最小 3D 场景、玩家控制、碰撞、摄像机和实时同步。
- **调试入口**：DebugBus 事件和 GM 指令帮助 AI agent 在不依赖肉眼观察的情况下验证状态。
- **Sprint 工作流**：通过 Cursor Skills、Rules、`AGENTS.md` 和 `docs/backlog/` 管理从想法到验收的开发循环。
- **可替换玩法层**：当前 `WhiteboxScene` 是稳定验证场，后续可以逐步替换为正式关卡、玩法系统和美术资源。

## 技术栈

- **前端**：TypeScript + Three.js + Vite + SCSS + GSAP
- **后端**：TypeScript + Express + Socket.IO + Node.js
- **测试**：Vitest（unit + smoke + E2E Puppeteer）
- **代码质量**：ESLint + Prettier + Husky + lint-staged
- **CI**：GitHub Actions
- **部署**：Dockerfile + `docker-compose.yml`

## 前置环境

- [Node.js](https://nodejs.org/) >= 20
- [npm](https://www.npmjs.com/) >= 9
- 可选：[Docker](https://www.docker.com/) 用于容器部署

## 快速开始

```bash
npm install
npm run dev
```

浏览器打开 Vite 输出的 URL（默认 `http://localhost:5173`）。

`npm install` 默认不会额外下载 Puppeteer 自带浏览器，因此本地开发不会被浏览器下载失败卡住。E2E 测试会优先复用本机已安装的 Chrome。如果本机没有 Chrome，第一次跑 E2E 前执行：

```bash
npm run browser:install
```

再开一个浏览器 tab 或用另一台机器访问同一 URL，输入不同名字后，两个角色可以互相看见并实时同步位置。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | 前端 + 后端并发启动（Vite + tsx watch） |
| `npm run build` | 构建前端到 `dist/` |
| `npm start` | 生产环境起服 |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm run lint` / `npm run lint:fix` | ESLint 检查 / 自动修复 |
| `npm run format` / `npm run format:check` | Prettier 格式化 / 检查 |
| `npm test` / `npm run test:watch` | 单元测试 |
| `npm run test:smoke` | 启动和通信冒烟测试 |
| `npm run test:e2e` | E2E 多人同步冒烟测试 |
| `npm run status:rebuild` | 从 Sprint frontmatter 重建 `docs/STATUS.md` |
| `docker compose up --build` | Docker 容器化运行 |

## 目录结构

```text
three-js-vibe-demo/
├── frontend/                # Vite 前端
│   ├── index.html           # DOM 入口
│   ├── main.ts              # 应用 bootstrap
│   ├── Experience/          # Three.js 核心
│   │   ├── Experience.ts    # 单例（scene / camera / renderer / 循环）
│   │   ├── Debug/           # DebugBus + GM
│   │   ├── Utils/           # 工具（Sizes / Time / Resources / RunContext 等）
│   │   └── World/           # 白盒场景、玩家和运行时资产加载
│   └── styles/              # SCSS
├── server/                  # Express + Socket.IO
│   ├── index.ts
│   ├── config.ts
│   ├── types.ts
│   └── sockets/             # /chat + /update
├── public/                  # 静态资产
│   ├── models/
│   ├── textures/environment/
│   ├── draco/
│   └── fonts/
├── scripts/                 # 辅助脚本
├── tests/                   # unit / smoke / E2E
├── docs/                    # 游戏设计 + 项目管理
├── .cursor/                 # Cursor AI 配置（rules / skills / mcp.json）
├── .github/workflows/       # CI
├── Dockerfile
└── docker-compose.yml
```

## AI 工作流

| Skill | 用途 |
| --- | --- |
| `/discuss-next` | AI 探索下一步开发方向 |
| `/game-design` | 讨论并记录游戏设计 |
| `/sprint-review` | 制作人验收 Sprint 并生成下一个 Sprint |
| `/sprint-execute` | AI 自动执行当前 Sprint |

项目状态见 `docs/STATUS.md`，架构和协作约定见 `AGENTS.md`。

## 操作说明

| 键 | 动作 |
| --- | --- |
| WASD / 方向键 | 移动 |
| Shift | 跑 |
| Space | 跳 |
| Enter | 打开 / 关闭聊天 |
| 鼠标拖拽 | 摄像机平移 |
| 鼠标中键 | 缩放 |
| O | 跳舞（如果当前角色动画支持） |

## Docker 部署

```bash
docker compose up --build
```

应用默认运行在 `http://localhost:3000`。

```bash
docker build -t three-js-vibe-demo .
docker run -p 3000:3000 three-js-vibe-demo
```

## 开发约定

- TypeScript 使用 `strict: true`，前端 / 后端分离 `tsconfig.json`。
- Import 路径使用 `.js` 后缀，匹配 TypeScript ESM 约定。
- ESLint + Prettier 由 Husky pre-commit hook 和 CI 共同检查。
- 路径别名：`@experience/*`、`@utils/*`、`@world/*`、`@styles/*`、`@server/*`。
- AI 开发前先读 `docs/STATUS.md`，Sprint 完成后通过 `npm run status:rebuild` 重建状态文件。

## 致谢

原始 Three.js + Socket.IO 脚手架由 [Andrew Woan](https://github.com/andrewwoan) 创建。本仓库在其基础上重整为面向 AI vibe coding 的多人 3D 游戏基础框架。

## License

MIT，见 [LICENSE.md](LICENSE.md)。
