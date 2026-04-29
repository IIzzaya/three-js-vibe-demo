---
name: sprint-execute
description: "Executes an active game sprint end-to-end: selects the right sprint, implements tasks, verifies acceptance criteria, commits task-sized changes, archives completed sprint reports, and prepares producer review. Use when the producer asks to run or execute an active sprint."
---

# Sprint Execute — AI 自动执行 Sprint

你是高效的游戏开发 AI agent，正在自动执行某个 active Sprint 的所有任务。该 workflow 支持多制作人并行开发：每位 owner 默认只执行自己的 active sprint。

## 路径、命令与环境契约

先读取 `.env`。如果存在下列配置，优先使用配置值；否则使用默认值：

| 配置名 | 默认值 | 用途 |
| --- | --- | --- |
| `PROJECT_OWNER` | 无默认值 | 当前制作人 / owner，建议 kebab-case |
| `GAME_MAIN_BRANCH` | `main` | rebase 目标分支 |
| `GAME_STATUS_PATH` | `docs/STATUS.md` | 项目状态全景 |
| `GAME_DESIGN_DIR` | `docs/game-design` | 游戏设计文档目录 |
| `GAME_BACKLOG_DIR` | `docs/backlog` | backlog 根目录 |
| `GAME_ACTIVE_SPRINT_DIR` | `docs/backlog/active` | active sprint 目录 |
| `GAME_COMPLETED_SPRINT_DIR` | `docs/backlog/completed` | completed sprint 目录 |
| `GAME_ABANDONED_SPRINT_DIR` | `docs/backlog/abandoned` | abandoned sprint 目录 |
| `GAME_STATUS_REBUILD_COMMAND` | `npm run status:rebuild` | 重建状态文档 |
| `GAME_TYPECHECK_COMMAND` | `npm run typecheck` | 类型检查 |
| `GAME_LINT_COMMAND` | `npm run lint` | lint |
| `GAME_UNIT_TEST_COMMAND` | `npm test` | 单元测试 |
| `GAME_E2E_TEST_COMMAND` | `npm run test:e2e` | E2E 测试 |
| `GAME_SMOKE_TEST_COMMAND` | `npm run test:smoke` | Smoke 测试 |
| `GAME_DEV_COMMAND` | `npm run dev` | 启动验收环境 |

如果某个命令不存在，先从项目脚本、README 或规则文件中寻找等价命令；确实没有才跳过并在完成摘要里说明。

## 默认 Sprint 契约

active sprint 文件默认位于 active sprint 目录，命名为 `sprint-{slug}.md`。frontmatter 默认包含：

```yaml
---
slug: 260425-owner-theme
status: active
created: YYYY-MM-DD
completed: null
track: gameplay
owner: owner-name
points_planned: 20
points_done: 0
summary: 一句话总结这个 sprint 的目的
---
```

任务默认使用 `T1`、`T2`、`T3` 作为 sprint-local 编号，状态为 `🔵 待开发`、`🟡 开发中`、`🟢 已完成`、`🔴 阻塞`。如果项目模板使用其他字段或状态，以项目约定为准。

## 启动流程

### 1. 确定本次执行的 Sprint

- 如果用户显式指定 sprint slug，直接使用该 sprint。
- 否则按顺序自动选择：
  1. active sprint 目录下只有 1 个 sprint：自动使用它。
  2. 多个 active sprint，但 owner 与 `.env` 的 `PROJECT_OWNER` 匹配的只有 1 个：自动使用它。
  3. 多个候选无法判断：列出候选 sprint，请制作人指定。

### 2. 校验环境

- 读取 `.env`，确认 `PROJECT_OWNER` 已配置；缺失则阻断执行，请制作人配置。
- 校验 sprint 文件存在、frontmatter 合法，至少包含 slug / status / owner / points 字段或项目等价字段。
- 校验 sprint owner 与 `PROJECT_OWNER` 一致。不一致时警告并请求确认。

### 3. 建立上下文

读取项目状态、本次 sprint 文件、任务关联设计文档、相关代码和项目规则。不要只看任务标题就开始实现。

### 4. 检查前置条件

- 确认 sprint 中有待开发任务；没有则进入 Sprint 收尾流程。
- 运行类型检查或项目等价基线命令，确认当前基线健康。
- 如果基线已失败，判断是否与当前任务相关；无关则记录，不要擅自重构。

## 任务执行循环

按优先级从高到低执行任务；同优先级按 `T` 编号顺序。

### 1. 领取任务

- 将任务状态从待开发改为开发中。
- 阅读验收标准、关联文档和相关代码。

### 2. 制定方案

- 在任务条目中补充"实现方案"小节。
- 说明涉及文件、验证方式和风险点。

### 3. 编码实现

- 编写代码实现功能，遵循项目现有架构和风格。
- 如果项目存在调试事件、GM 指令、cheat console、telemetry 或 QA hook，新功能必须接入；否则提供等价的可验证入口或测试覆盖。
- 编写必要测试。风险越高、越靠近共享系统，测试越完整。

### 4. 自检验收

- 逐项检查任务验收标准。
- 运行类型检查、lint 和单元测试或项目等价命令。
- 如果某个命令不存在，记录原因和替代验证方式。

### 5. 同步远端

每个任务 commit 前先 `git fetch origin`：

- 如果远端主分支有新提交，不要立即 rebase；rebase 留到 Sprint 收尾。
- fetch 失败通常不阻塞任务 commit，但要记录原因。

### 6. 提交代码

- stage 本任务相关文件。
- commit message 默认格式：`sprint-{slug} T{n}: {desc}`。
- commit identity 默认使用 `${PROJECT_OWNER}-ai`：

```bash
owner="$PROJECT_OWNER"
msg="sprint-260425-owner-theme T1: implement feature"
git -c user.name="$owner-ai" commit -m "$msg"
```

如果项目规则禁止自动 commit，遵循项目规则并在回复中说明未提交。

### 7. 更新看板

- 将任务状态改为已完成。
- 填写"完成摘要"。
- 累加 frontmatter `points_done` 或项目等价字段。
- 继续下一个任务。

## Sprint 收尾流程

当所有任务完成，或剩余任务全部阻塞时执行。

### 1. Rebase 同步远端

执行：

```bash
git pull --rebase origin "$GAME_MAIN_BRANCH"
```

冲突协议：

- 代码、设计文档、sprint 文件冲突：立即停止，不要自动解决，报告冲突文件并等待制作人决定。
- 自动生成的状态文件冲突：如果项目明确声明该文件可重建，可以接受远端版本并在后续 rebuild；否则同样停止询问。

### 2. 全量自检

- 运行 E2E 测试命令（如果项目有）。
- 运行 smoke 测试命令（如果项目有）。
- 必要时启动本地验收环境，确认应用可访问。

### 3. 生成 Sprint 验收报告

把 sprint 文件本身扩充成验收报告，补充：

- 完成概览：完成 / 未完成统计、`points_done` 终值。
- 已完成功能清单：每个任务的完成摘要。
- 体验指引：制作人如何体验成果。
- 已知问题 / 技术债。
- 下一步建议。

### 4. 归档 Sprint

- frontmatter 更新为：

```yaml
status: completed
completed: YYYY-MM-DD
```

- 用 `git mv` 将 sprint 文件从 active sprint 目录移动到 completed sprint 目录。

### 5. 重建状态文档

运行 `${GAME_STATUS_REBUILD_COMMAND:-npm run status:rebuild}`。状态文档如果是自动生成文件，不要手工编辑；应通过源数据和 rebuild 命令更新。

### 6. 最终提交与验收

- 把归档 sprint 文件、重建状态文档和必要收尾变更一起提交。
- commit message 默认：`sprint-{slug}: finalize and archive`。
- 不自动 push，除非制作人明确要求。
- 最终回复说明已完成内容、验证结果、是否本地领先远端，以及制作人下一步如何验收。

## 重要原则

- **不要跳过测试**：任务完成后必须运行合理自检；无法运行要说明原因。
- **不要忽略可验证性**：有调试/GM/telemetry 体系就接入；没有就补测试或可操作验证入口。
- **遇到阻塞时**：标记为阻塞，说明原因，继续处理其他可执行任务。
- **代码质量**：遵循项目语言、类型、lint、format 和架构约定。
- **commit 粒度**：默认每个任务一个 commit，不把多个任务混进一个提交。
- **不要碰别人的 active sprint**：多 owner 项目中只执行 owner 匹配的 sprint。
- **rebase 冲突保守处理**：除明确可重建的生成文件外，不自动解决冲突。
