# 旅行手帐文章

在文章 frontmatter 中设置 `pageLayout: journal`，即可启用手帐排版。文章仍使用博客集合、普通 Markdown 图片和现有 lightbox；不设置该字段的文章保持常规阅读布局。

```yaml
---
title: 沿着运河，慢慢走
pageLayout: journal
published: 2026-03-27
timezone: Asia/Shanghai
description: 沿着水边散步时看到的风景与小片段。
cover: ../.../../attachments/canal.jpg
tags:
  - 旅行
---
```

`cover` 是可选封面，用于首页、文章列表和分享预览；Journal 文章头部不展示封面，只显示标题、日期和引言。封面路径仍遵循博客文章的相对路径约定。

使用二级标题划分章节。章节内的普通文字、链接和其他 Markdown 内容保持原样。用 `photos` callout 标记一组照片，每张图写成一张图片并在 alt 文本中描述画面；同一段中并排写多张图也可以：

```markdown
## 运河边

沿着河岸走，船从桥下慢慢经过。

> [!photos]
> ![从桥上望向运河](../../attachments/canal.jpg)

## 老街午后

> [!photos]
> ![巷口的石阶](../../attachments/alley.jpg) ![河边的白墙](../../attachments/riverside.jpg)

> [!moment] 午后随手记
> 有些日子不需要发生什么，走一段路就已经很好。
```

紧邻照片组之后的 `moment` callout 会显示为便签旁注。桌面双图在图片加载完成后，优先将能完整放下的便签排在较矮照片下方的空白处；空间不足、单图、多图或移动端时，便签保持在图组下方。展开 EXIF 或折叠内容、调整窗口大小时会重新避让，不随滚动移动。单独使用时仍显示为便签旁注。Callout 中的正文、链接和可折叠内容会继续保留。图片说明从 alt 文本和现有图片标题规则生成，EXIF 信息与文章 lightbox 也沿用现有处理。

只给新文章显式设置 `pageLayout: journal`，不要批量改写或转换现有文章。开发服务器中的 `/dev/journal` 是独立预览，使用虚构文案和附有来源链接的 Wikimedia Commons 照片，不进入内容集合。

照片组与随手记之间要留一个**不带 `>` 的空行**，这样它们才是两个独立 Callout。桌面双图按主次分配宽度，移动端双图等宽；照片保留原比例，照片下方默认显示相机型号，点击型号展开拍摄参数，点击照片可查看大图。需要在文章中展示的封面照片，请放入正文照片组；头部不会重复展示。


## 相册收录

在 Journal 文章原有 frontmatter 中增加 `album: true`，该文章顶层 `[!photos]` 照片组中的图片会进入 `/album`。不设置或设置为 `false` 时不收录，普通正文插图、附件目录中的未引用图片都不会自动进入相册。

```yaml
pageLayout: journal
album: true
```

图片仍放在原附件目录，无需复制到相册目录。首版只收录已导出的本地 JPG、PNG、WebP、GIF 附件；缺失附件会跳过，远程图片不收录。同一附件跨文章复用时合并为一张照片，保留各篇原文入口，按最新来源文章的发布日期归档。日期是站点时区下的**发布日期**，不是 EXIF 拍摄日期。

点击图片打开大图，显示已有 EXIF 与原文入口；图片下方的文章标题也可直接跳转。移除 `album: true` 不会删除附件或改变正文。

`/dev/album` 仅在本地开发环境提供已有 Journal 的展示预览，不写回文章标记，不生成生产页面。
