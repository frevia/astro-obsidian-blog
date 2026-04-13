# Be Good One

一个基于 [Astro](https://astro.build/) 构建的个人网站，用于记录生活中的片段。

## ✨ 特性

- 📝 **类型安全的 Markdown** - 完全的 TypeScript 支持
- ⚡ **超快性能** - 基于 Astro 的静态站点生成
- ♿ **无障碍访问** - 支持键盘导航和屏幕阅读器
- 📱 **响应式设计** - 从移动设备到桌面的完美适配
- 🔍 **SEO 友好** - 优化的搜索引擎表现
- 🌓 **明暗主题** - 支持亮色和暗色模式切换
- 🔎 **模糊搜索** - 基于 Pagefind 的快速搜索功能
- 📄 **草稿和分页** - 支持草稿文章和分页显示
- 🗺️ **站点地图和 RSS** - 自动生成站点地图和 RSS 订阅
- 🎨 **高度可定制** - 灵活的配置和样式定制
- 🖼️ **动态 OG 图片** - 自动生成博客文章的 OG 图片
- 📔 **时间线功能** - 首页默认展示日常时间线
- 📚 **媒体卡片** - 支持电影、书籍等媒体信息展示
- 💬 **评论功能** - 使用 Twikoo 支持文章与日记评论
- 🖼️ **媒体卡片** - 支持电影、书籍等媒体信息展示
- 🖼️ **图片灯箱** - 点击图片查看大图，支持缩放和拖动
- 🖼️ **EXIF 信息** - 显示图片的 EXIF 信息
- 🖼️ **路径补全** - 自动补全图片路径，支持相对路径和绝对路径
- 🖼️ **拼图功能** - 支持将图片拼接成大图片
- 📅 **日历功能** - 支持农历、节气、工作日/节假日显示，悬浮日历效果，顶部日期挂件，点击弹窗查看详细日历
- 🎐 **风铃效果** - 顶部日期挂件下方显示工作日/休息日，带有风铃飘动动画
- 📡 **RSS 数据定时抓取** - 每天自动拉取订阅的博客更新，保持内容新鲜

## 🚀 项目结构

```bash
/
├── public/
│   ├── favicon.png
│   ├── app-controls.js
│   └── og.png
├── src/
│   ├── assets/          # 静态资源（图标、图片等）
│   ├── components/      # Astro 和 React 组件
│   ├── data/
│   │   ├── blog/        # 博客文章
│   │   ├── diary/       # 日常时间线
│   │   └── attachment/  # 媒体附件
│   ├── layouts/         # 页面布局
│   ├── pages/           # 页面路由
│   │   ├── diary/       # 日记相关页面
│   │   ├── posts/       # 博客文章页面
│   │   └── api/         # API 路由
│   ├── styles/          # 样式文件
│   ├── utils/           # 工具函数
│   ├── config.ts        # 网站配置
│   └── constants.ts     # 常量定义
├── astro.config.ts      # Astro 配置
└── package.json
```

## 🛠️ 技术栈

- **主框架**: [Astro](https://astro.build/)
- **类型检查**: [TypeScript](https://www.typescriptlang.org/)
- **样式**: [TailwindCSS](https://tailwindcss.com/)
- **UI 组件**: [React](https://react.dev/)
- **搜索**: [Pagefind](https://pagefind.app/)
- **图标**: [Lucide React](https://lucide.dev/)
- **代码格式化**: [Prettier](https://prettier.io/)
- **代码检查**: [ESLint](https://eslint.org/)
- **部署**: [Vercel](https://vercel.com/)
- **留言**: [Twikoo](https://twikoo.js.org/)

## 📦 安装和使用

### 环境要求

- Node.js 18+
- pnpm (推荐)

### RSS 数据定时抓取

项目支持每天自动拉取订阅的博客更新，保持 feeds 页面的内容新鲜。

#### 配置方式

1. **编辑 RSS 订阅列表**
   - 在 `public/data/feeds/rss-subscriptions.json` 文件中添加或修改博客的 RSS 源
   - 示例配置：

     ```json
     {
       "subscriptions": [
         {
           "url": "https://example.com/rss.xml",
           "avatar": "https://example.com/avatar.png"
         }
       ]
     }
     ```

2. **定时任务配置**
   - 项目使用 Vercel 的定时任务功能，每天 8:00 AM 自动执行数据抓取
   - 配置文件：`vercel.json`
   - API 端点：`src/pages/api/fetch-rss.ts`

#### 手动执行

如果需要手动执行 RSS 数据抓取，可以运行以下命令：

```bash
pnpm run fetch:rss-feeds
```

#### 工作原理

1. Vercel 定时任务每天 8:00 AM 调用 `/api/fetch-rss` 端点
2. 该端点执行 `scripts/fetch-rss-feeds.js` 脚本
3. 脚本从 RSS 订阅源拉取最新数据，生成 `public/data/feeds/feeds.json` 文件
4. 页面加载时使用最新的 RSS 数据，确保显示的是最新的博客更新

### 本地开发

```bash
# 克隆项目
git clone https://github.com/frevia/astro-obsidian-blog.git
cd astro-obsidian-blog

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

访问 `http://localhost:4321` 查看网站。

### 构建和部署

```bash
# 构建生产版本
pnpm build

# 预览构建结果
pnpm preview
```

### 足迹地图标签数据（本地生成）

足迹地图**全国省名与省内市名**的排布共用同一套预计算（弦 + 中心点），避免在浏览器端跑 Turf。

```bash
# 生成/更新市、省标签弦与中心点 JSON
pnpm run generate:footprint-labels
```

- 生成脚本：`scripts/generate-footprint-city-labels.ts`
- 输出文件：`public/data/footprint/footprint-city-label-chords.json`（键含 `省Key-city-序号` 与 `nation-province-序号`）
- 建议在以下场景重新生成：升级 Turf、调整标签算法参数、地图数据源变更
- 该 JSON 属于构建输入，建议提交到仓库

## ⚙️ 配置

网站的主要配置位于 `src/config.ts` 文件中，你可以修改以下设置：

- 网站基本信息（标题、描述、作者等）
- 社交媒体链接
- 主题设置
- 分页设置
- 功能开关
- 日历功能配置（通过 `showCalendar` 控制是否显示日历功能）

## 📝 添加内容

### 博客文章

在 `src/data/blog/` 目录下创建 Markdown 或 MDX 文件，文件需要包含以下 frontmatter：

```markdown
---
title: "文章标题"
author: "作者名称"
published: 2025-01-01T12:00:00+08:00
tags:
  - "标签1"
  - "标签2"
toc: true # 可选，是否显示目录
description: "文章描述"
cover: "../attachment/og/image.png" # 可选，OG图片
slug: "article-slug" # 可选，自定义URL
---

文章内容...
```

支持的文件格式：

- `.md` - 标准 Markdown 文件
- `.mdx` - 支持 React 组件的 MDX 文件

### 日记

在 `src/data/diary/` 目录下创建以日期命名的 Markdown 文件（如 `2025-01-30.md`），记录日常。

日记文件格式：

````markdown
## 21:02

记录内容...

```card-movie
source: douban
id: 电影ID
title: 电影标题
```
````

支持卡片组件：

- `card-movie` - 电影卡片，支持豆瓣/IMDB数据
- `card-book` - 书籍卡片，支持豆瓣数据
- 其他媒体卡片组件，具体查看[obsidian-card-viewer](https://github.com/vsme/obsidian-card-viewer)。

卡片建议搭配 Obsidian 使用（PS:需要自己写抓取脚本）：
[GitHub 资产链接](https://github.com/user-attachments/assets/fab12904-d1db-41c2-83bf-fd26013910f1)

## 🎨 自定义样式

项目使用 TailwindCSS 进行样式管理，你可以：

1. 修改 `src/styles/global.css` 中的全局样式
2. 在组件中使用 TailwindCSS 类名
3. 通过 CSS 变量自定义主题颜色

## 📝 Obsidian 插件推荐

以下是在 Obsidian 中使用本项目时推荐的插件：

| 插件名称                  | 功能描述   | 与项目配合                                                         |
| ------------------------- | ---------- | ------------------------------------------------------------------ |
| **Attachment Management** | 附件管理   | 可重命名目录中的媒体文件                                           |
| **BRAT**                  | 测试插件   | 可以用于测试 Obsidian 插件的 beta 版本                             |
| **Card Viewer**           | 卡片查看器 | 与项目中的媒体卡片功能配合，支持在 Obsidian 中预览电影、书籍等卡片 |
| **Dataview**              | 数据视图   | 可以在 Obsidian 中创建基于日记数据的视图和查询                     |
| **Git**                   | 版本控制   | 用于管理 Obsidian 笔记的版本，与项目的 Git 工作流配合              |
| **Iconize**               | 图标管理   | 为笔记添加图标，增强视觉识别                                       |
| **Linter**                | 代码检查   | 保持 Markdown 文件的格式一致性，与项目的 ESLint 配合               |
| **Templater**             | 模板管理   | 创建和使用笔记模板，提高内容创建效率                               |
| **Terminal**              | 终端集成   | 在 Obsidian 中执行命令，方便与项目的构建和部署流程配合             |

这些插件可以帮助你在 Obsidian 中更高效地管理和编辑内容，然后通过本项目的构建流程生成美观的静态网站。

## 📄 许可证

本项目基于 MIT 许可证开源。

## 🙏 致谢

本项目基于以下开源项目进行开发，在此表示诚挚的感谢：

- **[vsme/astro-obsidian-blog](https://github.com/vsme/astro-obsidian-blog)** - 提供了项目的基础架构和核心功能，为本项目提供了重要的灵感和代码参考
- **[satnaing/astro-paper](https://github.com/satnaing/astro-paper)** - 由 [Sat Naing](https://github.com/satnaing) 创建的优秀 Astro 博客主题，为本项目提供了坚实的基础
- **[achuanya/astro-lhasa](https://github.com/achuanya/astro-lhasa)** - 提供了进度条、分类、灯箱以及数据统计方面的设计灵感

特别感谢以下开源工具和库：

- **[Astro](https://astro.build/)** - 现代化的静态站点生成器，为项目提供了高效的构建和渲染能力
- **[TailwindCSS](https://tailwindcss.com/)** - 实用优先的 CSS 框架，使样式开发更加高效和一致
- **[Pagefind](https://pagefind.app/)** - 静态搜索解决方案，为网站提供了快速的搜索功能
- **[Photosuite](https://photosuite.lhasa.icu/)** - 显示图片exif、内容排版、图片灯箱等功能，为图片展示提供了丰富的功能
- **[Chinese Days](https://github.com/vsme/chinese-days)** - 中国农历日期/节气/节假日工具，为日历功能提供了核心支持

---

💝 用心记录生活中的每一个温暖瞬间
