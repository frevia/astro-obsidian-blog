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

`cover` 是可选的显式封面。没有封面时，标题区会铺满可用宽度，不会生成动态 OG 图片占位。封面路径仍遵循博客文章的相对路径约定。

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

紧邻照片组之后的 `moment` callout 会显示在照片组下方，作为轻量文字旁注；单独使用时，它会显示为轻量旁注。Callout 中的正文、链接和可折叠内容会继续保留。图片说明从 alt 文本和现有图片标题规则生成，EXIF 信息与文章 lightbox 也沿用现有处理。

只给新文章显式设置 `pageLayout: journal`，不要批量改写或转换现有文章。开发服务器中的 `/dev/journal` 是独立预览，使用虚构文案和附有来源链接的 Wikimedia Commons 照片，不进入内容集合。

照片组与随手记之间要留一个**不带 `>` 的空行**，这样它们才是两个独立 Callout。桌面双图按主次分配宽度，移动端双图等宽；照片保留原比例，拍摄参数显示在照片下方，点击可查看大图。封面是独立图片，正文中无需再次插入相同图片。
