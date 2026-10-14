import { describe, expect, it } from "vitest";
import { countContentWords } from "./countContentWords";

describe("countContentWords", () => {
  it("counts Chinese characters and English words, excluding punctuation", async () => {
    expect(await countContentWords("你好，世界！Hello world 2026 😀")).toBe(7);
  });
  it("keeps link labels but excludes URLs, images, frontmatter and code blocks", async () => {
    expect(
      await countContentWords(`---
title: 不统计标题元数据
---
# 正文
[链接](https://example.com/path) ![图片说明](photo.jpg)
<https://example.com>
\`API\`
\`\`\`js
const ignored = "不统计代码";
\`\`\`
\`\`\`card-book
title: 不统计卡片配置
\`\`\`
`)
    ).toBe(5);
  });
  it("handles wiki labels, callouts, tables and inline formatting", async () => {
    expect(
      await countContentWords(
        "[[很长的目标路径|别名]]\n\n> [!note]- 提示\n> 内容\n\n| 列 |\n| --- |\n| 值 |\n\nhel**lo**"
      )
    ).toBe(9);
  });
  it("returns zero for empty or image-only content", async () => {
    expect(await countContentWords("")).toBe(0);
    expect(await countContentWords("![[photo.png]]")).toBe(0);
  });
});
