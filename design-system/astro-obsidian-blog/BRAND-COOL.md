# worktree 配色 · 方案 C+「冷白」

| 角色 | Light |
|------|-------|
| Background | `#ffffff` |
| Surface muted | `#f6f9fb` |
| Foreground | `#25313d` |
| Foreground muted | `#566574` |
| Border | `#dfe7ed` |
| Border strong | `#c8d5de` |
| Accent | `#3d6b7f` |
| Year progress | `#38bdf8` → `#2563eb` |

## Surface rules

- 普通卡片使用 `--radius-card`（`0.875rem`）和 `--shadow-sm`。
- 重点容器使用 `--radius-card-emphasis`（`1.125rem`）和 `--shadow-md`。
- 页面背景保持纯白；内容色只用于标签、状态和交互，不再给每张卡片叠加渐变。
- 列表分隔线使用 `--border`，交互态通过 `--interactive-hover` 和 `--accent` 建立层级。
- 年度进度使用 `--year-progress-start` 到 `--year-progress-end` 的科技蓝渐变，避免与警示色混用。
