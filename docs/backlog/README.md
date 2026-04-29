# 开发看板

## 概述
本目录是项目的任务管理系统，完全基于 Markdown 文件驱动。多制作人并行 Sprint 工作流详见 `.cursor/rules/sprint-workflow.mdc`。

## 文件结构
```
backlog/
├── active/          # 进行中 sprint（每位制作人各一个 sprint-{slug}.md）
├── completed/       # 已完成 sprint 验收报告
├── abandoned/       # 已放弃 sprint
├── ideas/           # 待孵化的想法（{slug}.md，单文件单想法）
└── templates/       # task-template.md / 后续可加 sprint-template.md
```

## 命名规范
- **Sprint 文件**：`sprint-{YYMMDD}-{owner}-{theme}.md`
  - `YYMMDD` = 创建日期；`owner` = `.env` 的 `PROJECT_OWNER`；`theme` = AI 提炼的 kebab-case 主题
  - 同日同 owner 同 theme 撞名 → 加后缀 `-ii` / `-iii`
- **Idea 文件**：`ideas/{slug}.md`（slug = kebab-case 主题词）
- **Task ID**：sprint 内部递增 `T1` / `T2` / ...

## Sprint 文件 frontmatter
每个 sprint 文件**必须**带 YAML frontmatter（`scripts/build-status.ts` 据此生成 `STATUS.md`）：

```yaml
---
slug: 260425-izaya-feature-name
status: active        # active | completed | abandoned
created: 2026-04-25
completed:            # 完成日期（active 时留空）
track: gameplay       # meta | gameplay | art | tech | design | infra
owner: izaya          # 与 .env PROJECT_OWNER 一致
points_planned: 20
points_done: 0
summary: 短句描述本 sprint 的目标
---
```

## Idea 文件 frontmatter
```yaml
---
slug: feature-name
created: 2026-04-25
proposer: izaya       # 谁提的
status: idea          # idea | claimed | dropped
size: M               # S | M | L 粗略估算
tags: [gameplay, mvp]
---
```

## 任务状态定义
- 🔵 **待开发** — 已排入 Sprint，等待 AI 领取
- 🟡 **开发中** — AI 正在实现
- 🟢 **已完成** — 实现完毕，通过自检
- 🔴 **阻塞** — 因依赖或问题无法继续

## 任务分类
- 🆕 **功能** — 新增功能
- 🐛 **修复** — Bug 修复
- ♻️ **重构** — 代码重构
- 🎨 **美术** — 美术资产相关
- 📝 **设计** — 设计文档更新
- ⚡ **优化** — 性能或体验优化

## 点数制
每个任务分配故事点数来量化工作量。单个 Sprint 总容量约 **20 点**。

## AI 工作流（详见 `/sprint-execute` skill）
1. 选定 active sprint：显式 slug > 唯一 active 自动选 > owner 匹配 > 多个让人选
2. 校验 `.env` 的 `PROJECT_OWNER` 与 sprint frontmatter 的 owner 一致
3. AI 从 `active/sprint-{slug}.md` 选取优先级最高的「待开发」任务
4. 更新状态为「开发中」
5. 阅读关联设计文档和代码上下文
6. 编码实现 + 注册 DebugBus / GM + 编写测试
7. 运行 typecheck / lint / test 自检
8. `git fetch origin`，然后以 `${owner}-ai` 身份 commit（message 格式 `sprint-{slug} T{n}: {desc}`）
9. 更新任务状态为「已完成」并累加 `points_done`
10. 继续下一个任务，直到 Sprint 清空
11. **Sprint 收尾**：
    - `git pull --rebase origin main`（冲突协议：除 STATUS.md 外不自动解决，停下问制作人）
    - `npm run test:e2e` / `npm run test:smoke`
    - 把 sprint 文件扩充为验收报告
    - 改 frontmatter `status: completed` + `completed: <today>`
    - `git mv active/sprint-{slug}.md completed/`
    - `npm run status:rebuild` 重建 `docs/STATUS.md`
    - `npm run dev` 启动开发服务器供制作人验收
    - 不自动 push；最终回复提示"当前本地 `main` 已领先远端，等待制作人手动 push"

## 共享文件冲突处理
- `docs/STATUS.md` 永远 `git checkout --theirs` + `npm run status:rebuild`，**不要手工 merge**
- 共享代码（`package.json`、共用 utils 等）冲突 → 停下问制作人，**AI 不要自动 resolve**
