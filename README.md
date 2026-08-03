# Frevia's Blog!

一个基于 [Astro](https://astro.build/)、[Astro Paper](https://github.com/satnaing/astro-paper) 和 Obsidian 内容工作流构建的个人网站，用来记录文章、碎片、收藏、足迹与订阅。

线上站点：[frevia.site](https://frevia.site/)

## ✨ 当前特性

### Astro 7 与 Astro Paper 基线

- Astro `7.1.6`、Astro Paper `6.1.0` 风格配置和 Sätteri Markdown 渲染管线
- Astro Content Collections + `deferRender`，延迟昂贵的 Markdown 渲染
- 原生 View Transition（`features.viewTransitions: "native"`），并为灯箱、返回按钮、目录等交互提供跨页面生命周期清理
- Astro 预取（默认 hover 策略）、静态输出、站点地图、RSS 和动态 OG 图片
- Tailwind CSS v4、TypeScript、React 19（通过 Preact 兼容层）和本地字体

### 内容与阅读体验

- Markdown / MDX 文章、日常碎片、收藏剪辑和 Obsidian wikilink
- 双向链接面板：展示当前页面链接到的内容，以及引用当前页面的反向链接
- 服务端生成的文章目录、阅读进度定位和代码工具栏
- Sätteri + Shiki 代码高亮，支持语言标识、复制按钮、文件名、差异和行高亮
- Mermaid 图表按需加载，避免首页和普通文章提前下载图表引擎
- 电影、书籍、音乐、剧集媒体卡片；媒体卡片保持零客户端水合
- 图片灯箱、缩放、拖动、EXIF 信息、图片路径补全和拼图展示

### 低水合与交互增强

- 日历组件使用 `client:idle`，首页和碎片时间线在浏览器空闲时水合
- 足迹地图使用 `client:visible`，Leaflet 地图不可用时自动退回地点列表
- `Cmd/Ctrl + K` 打开原生搜索面板，Pagefind 引擎在首次搜索时按需加载
- 响应式布局、键盘导航、语义化控件、明暗主题和 reduced-motion 支持
- 收藏页主题筛选、标签折叠、年份索引和阅读目录体验
- Leaflet 足迹地图、地点索引、文章关联和明亮地图配色
- Twikoo 评论、RSS 邻居订阅和 Vercel Cron 定时抓取

## 🚀 项目结构

```text
/
├── astro-paper.config.ts       # 网站可编辑配置
├── astro.config.ts             # Astro、Sätteri、Vite 和部署配置
├── public/
│   ├── data/feeds/             # RSS 订阅与生成数据
│   └── data/footprint/         # 足迹地图标签数据
├── src/
│   ├── data/                   # 独立 blog-data Git 子模块
│   │   ├── blog/               # 博客文章
│   │   ├── snippets/           # 日常碎片时间线
│   │   ├── clip/               # 收藏剪辑
│   │   └── attachments/        # 内容附件
│   ├── components/             # Astro、React 和 Preact 组件
│   ├── layouts/                # 页面与文章布局
│   ├── markdown/               # Sätteri、链接、卡片和代码处理器
│   ├── pages/                  # 页面与 API 路由
│   ├── scripts/                # 搜索、Mermaid 和页面生命周期脚本
│   ├── styles/                 # 全局样式与主题 token
│   ├── utils/                  # 内容解析、图片和 wikilink 工具
│   ├── config.ts               # 用户配置的 resolved 兼容视图
│   └── content.config.ts       # Astro 内容集合和 schema
├── scripts/                    # 构建、RSS、地图标签和校验脚本
└── package.json
```

`src/data` 是独立的 Git 子模块，地址为 [`frevia/blog-data`](https://github.com/frevia/blog-data)。修改文章或附件前，请确认子模块已经初始化。

## 🛠️ 技术栈

| 类别       | 技术                                                            |
| ---------- | --------------------------------------------------------------- |
| 应用框架   | [Astro 7](https://astro.build/)                                 |
| 主题基线   | [satnaing/astro-paper](https://github.com/satnaing/astro-paper) |
| Markdown   | [Sätteri](https://github.com/HiDeoo/satteri)、MDX、Shiki        |
| 样式       | [Tailwind CSS 4](https://tailwindcss.com/)                      |
| UI 岛屿    | React 19 / Preact compat                                        |
| 搜索       | [Pagefind](https://pagefind.app/)                               |
| 地图       | [Leaflet](https://leafletjs.com/) + OpenStreetMap 瓦片          |
| 检查与测试 | TypeScript、ESLint、Prettier、Vitest、Astro Check               |
| 部署       | [Vercel](https://vercel.com/) adapter                           |
| 评论       | [Twikoo](https://twikoo.js.org/)                                |

## 📦 安装与开发

### 环境要求

- Node.js `22.23.2`（`.nvmrc`，同时受 `engines` 限制为 `>=22.23.2 <23`）
- pnpm `10.11.0`（由 `packageManager` 固定）

### 首次克隆

内容目录 `src/data` 是独立的 Git 子模块，建议直接递归克隆：

```bash
git clone --recurse-submodules https://github.com/frevia/astro-obsidian-blog.git
cd astro-obsidian-blog
```

已有工作区可以补初始化：

```bash
git submodule update --init --recursive
```

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
   - 项目使用 Vercel Cron，按 `vercel.json` 中的 `0 8 * * *` 执行数据抓取
   - 配置文件：`vercel.json`
   - API 端点：`src/pages/api/fetch-rss.ts`

#### 手动执行

如果需要手动执行 RSS 数据抓取，可以运行以下命令：

```bash
pnpm run fetch:rss-feeds
```

#### 工作原理

1. Vercel Cron 调用 `/api/fetch-rss` 端点
2. 该端点执行 `scripts/fetch-rss-feeds.js` 脚本
3. 本地脚本从 RSS 订阅源拉取最新数据，生成 `public/data/feeds/feeds.json` 文件
4. 配置 `BLOB_READ_WRITE_TOKEN` 后，服务端会将结果同步到 Vercel Blob，页面优先读取最新数据

### 本地开发

```bash
# 克隆项目并初始化内容子模块
git clone --recurse-submodules https://github.com/frevia/astro-obsidian-blog.git
cd astro-obsidian-blog

# 使用项目指定 Node 版本并安装依赖
nvm install
nvm use
corepack enable
pnpm install --frozen-lockfile

# 启动开发服务器
pnpm dev
```

访问 `http://localhost:4321` 查看网站。

### 构建与部署

```bash
# 构建生产版本
pnpm run build

# 只检查静态客户端页面
python3 -m http.server 4173 --directory dist/client
```

生产适配器为 `@astrojs/vercel`。API、Vercel Cron 和 Blob 行为应在 Vercel 或 `vercel dev` 环境中验证，不要仅依赖静态文件服务器判断服务端功能。

### 构建与验证

```bash
pnpm run lint
pnpm run format:check
pnpm run test
pnpm run verify:theme
pnpm run build
pnpm run verify:responsive
pnpm run verify:footprint
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

请优先编辑根目录的 `astro-paper.config.ts`，不要直接修改 `src/config.ts`。后者会把新配置解析成现有业务代码使用的 `SITE` 兼容视图。

常用配置示例：

```ts
export default defineAstroPaperConfig({
  site: {
    url: "https://example.com/",
    title: "Example Blog",
    description: "一个个人网站。",
    author: "作者",
    lang: "zh-CN",
    timezone: "Asia/Shanghai",
  },
  posts: {
    perPage: 10,
    perIndex: 5,
  },
  features: {
    search: "pagefind", // 也可以设置为 false
    viewTransitions: "native", // 或 client-router
    lightAndDarkMode: true,
  },
  local: {
    content: {
      blogPath: "src/data/blog",
      diaryPath: "src/data/snippets",
      clipPath: "src/data/clip",
    },
    showCalendar: true,
    comments: { enabled: true },
  },
});
```

### 环境变量

```bash
cp .env.example .env
```

`.env.example` 中包含 Twikoo 和 Google Search Console 的示例配置：

- `PUBLIC_TWIKOO_ENV_ID`、`PUBLIC_TWIKOO_REGION`、`PUBLIC_TWIKOO_LANG`
- `PUBLIC_GOOGLE_SITE_VERIFICATION`

部署 RSS 定时同步时，还需要在 Vercel 配置：

- `BLOB_READ_WRITE_TOKEN`：将生成的 RSS 数据写入 Vercel Blob
- `CRON_SECRET`：保护 `/api/fetch-rss`（建议配置）
- `BLOB_STORE_ACCESS`：控制 Blob 访问级别

足迹地图可通过 `PUBLIC_FOOTPRINT_TILE_URL` 和 `PUBLIC_FOOTPRINT_TILE_ATTRIBUTION` 覆盖默认瓦片地址与版权信息。

## 🗺️ 页面入口

- `/`：首页、最新文章和碎片时间线
- `/posts/`：文章索引与分页
- `/favorites/`：收藏剪辑、主题筛选与年份索引
- `/footprint/`：地点地图、足迹列表和关联文章
- `/feeds/`：邻居 RSS 订阅
- `/about/`：关于页面与评论
- `/search/`：搜索页 fallback；全局搜索默认由 `Cmd/Ctrl + K` 打开
- `/rss.xml`：RSS 输出

## 📝 添加内容

### 博客文章

在 `src/data/blog/` 中创建 `.md` 或 `.mdx` 文件。内容目录属于子模块，修改后需要在子模块中单独提交，再回到主仓库更新子模块指针。

```markdown
---
title: "文章标题"
author: "作者名称"
published: 2025-01-01T12:00:00+08:00
tags:
  - "标签1"
  - "标签2"
description: "文章描述"
cover: "../../attachments/og/image.png" # 可选，按文件层级调整相对路径
canonicalURL: "https://example.com/original" # 可选
---

文章内容...
```

支持 Markdown、MDX、数学公式、Mermaid、Obsidian wikilink、附件图片和媒体卡片。标题目录和文章阅读栏会根据页面内容自动生成。

### 碎片

碎片放在 `src/data/snippets/`，按年份和月份组织，例如 `2026/04/2026-04-13.md`。收藏剪辑放在 `src/data/clip/`，使用 `title`、`published`、`tags`、`description` 等 frontmatter 字段。

媒体卡片使用 Obsidian 风格的 fenced block：

````markdown
## 21:02

记录内容...

```card-movie
source: douban
id: 电影ID
title: 电影标题
```
````

目前支持 `card-movie`、`card-tv`、`card-book` 和 `card-music`。媒体信息通常由 Obsidian 工作流或现有抓取脚本写入。

### Wikilink

```markdown
[[另一篇文章]]
[[另一篇文章#某个标题|自定义显示文字]]
```

文章详情页会根据这些链接生成“链接到”和“引用本文”两个方向的关系面板。

## 🎨 自定义样式

项目使用 Tailwind CSS v4 和 CSS 变量管理主题：

1. 在 `src/styles/global.css` 中调整颜色、字体和主题 token。
2. 在 Astro / React 组件中使用 Tailwind 类名。
3. 修改前运行 `pnpm run verify:theme` 和 `pnpm run verify:responsive`，避免生产压缩过程丢失响应式规则。

## 📝 Obsidian 插件推荐

以下插件适合配合本项目的 Obsidian 内容工作流：

| 插件                  | 用途                                   |
| --------------------- | -------------------------------------- |
| Attachment Management | 管理和重命名附件                       |
| Card Viewer           | 在 Obsidian 中预览电影、书籍等媒体卡片 |
| Dataview              | 创建碎片数据视图                       |
| Git                   | 管理笔记和内容子模块版本               |
| Linter                | 统一 Markdown 格式                     |
| Templater             | 创建文章和碎片模板                     |

这些插件可以帮助你在 Obsidian 中更高效地管理和编辑内容，然后通过本项目的构建流程生成美观的静态网站。

## 📄 许可证

本项目基于 MIT 许可证开源。

## 🙏 致谢

- [Astro](https://astro.build/)：现代化的内容驱动网站框架
- [satnaing/astro-paper](https://github.com/satnaing/astro-paper)：博客主题基线
- [Sätteri](https://github.com/HiDeoo/satteri)：Markdown 渲染管线
- [vsme/astro-obsidian-blog](https://github.com/vsme/astro-obsidian-blog)：Obsidian 博客工作流参考
- [Pagefind](https://pagefind.app/)：静态搜索
- [Leaflet](https://leafletjs.com/) 与 [OpenStreetMap](https://www.openstreetmap.org/)：足迹地图
- [Chinese Days](https://github.com/vsme/chinese-days)：农历、节气与节假日数据
- [Photosuite](https://photosuite.lhasa.icu/)：图片 EXIF 和灯箱体验参考

---

💝 用心记录生活中的每一个温暖瞬间
