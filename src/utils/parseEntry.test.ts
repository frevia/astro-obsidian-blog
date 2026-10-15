import { load } from "cheerio";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/utils/optimizeImages", () => ({
  optimizeImage: vi.fn(
    async (src: string, options?: { needFullSize?: boolean }) => ({
      thumbnail: src,
      ...(options?.needFullSize ? { original: src } : {}),
      width: 400,
      height: 300,
    })
  ),
}));

import { parseEntry, withBaseIfRootRelative } from "./parseEntry";

describe("parseEntry base path handling", () => {
  it("prefixes root-relative diary image outputs and optimization fallbacks", async () => {
    const result = await parseEntry(
      {
        id: "2026-Q2/2026-06-01.md",
        body: [
          "## 10:00",
          "",
          "![Root image](/images/root.png)",
          "![[/images/wiki.png|Wiki image]]",
          "",
          "```imgs",
          "![Gallery](/images/gallery.png)",
          "```",
          "",
          "```html",
          '<img src="/data/attachment/missing.png">',
          "```",
          "",
          "```card-movie",
          "title: Movie",
          "poster: /posters/movie.png",
          "```",
        ].join("\n"),
      } as never,
      "/blog"
    );

    const block = result.timeBlocks[0];

    expect(block.text).toContain('src="/blog/images/root.png"');
    expect(block.text).toContain('src="/blog/images/wiki.png"');
    expect(block.images[0]).toMatchObject({
      src: "/blog/images/gallery.png",
      original: "/blog/images/gallery.png",
    });
    expect(block.htmlContent).toContain(
      'src="/blog/data/attachment/missing.png"'
    );
    expect(block.movieData?.poster).toBe("/blog/posters/movie.png");
  });

  it("turns a lone blog link after a media card into a related article action", async () => {
    const result = await parseEntry(
      {
        id: "2026/03/2026-03-29.md",
        body: [
          "## 21:00",
          "",
          "```card-movie",
          "title: 阿弥陀堂讯息",
          "```",
          "",
          "---",
          "",
          "[【电影】山里的来信](../../../blog/生活/【电影】山里的来信.md)",
        ].join("\n"),
      } as never,
      "/blog"
    );

    expect(result.timeBlocks[0]).toMatchObject({
      postText: "",
      relatedPostLink: {
        href: "/blog/posts/91759f8c397248dda1d84bce224e62f1",
        title: "【电影】山里的来信",
      },
    });
  });

  it("keeps ordinary links in note prose as inline links", async () => {
    const result = await parseEntry({
      id: "2026/03/2026-03-29.md",
      body: [
        "## 21:00",
        "",
        "继续阅读 [【电影】山里的来信](../../../blog/生活/【电影】山里的来信.md)。",
      ].join("\n"),
    } as never);

    expect(result.timeBlocks[0].relatedPostLink).toBeUndefined();
    expect(result.timeBlocks[0].text).toContain("decoration-dashed");
  });

  it("turns a trailing standalone blog link into a related article without a media card", async () => {
    const result = await parseEntry({
      id: "2026/03/2026-03-28.md",
      body: [
        "## 07:00",
        "",
        "缅怀张雪峰老师。",
        "",
        "---",
        "",
        "[张雪峰老师给我们最后的5条经验](../../../blog/生活/张雪峰老师给我们最后的5条经验.md)",
      ].join("\n"),
    } as never);

    expect(result.timeBlocks[0].text).toContain("缅怀张雪峰老师。");
    expect(result.timeBlocks[0].text).not.toContain("decoration-dashed");
    expect(result.timeBlocks[0].relatedPostLink).toEqual({
      href: "/posts/4a3aa00b32ad4f5bb8bd724bf7722318",
      title: "张雪峰老师给我们最后的5条经验",
    });
  });

  it("does not rewrite relative, external, or protocol-relative image paths", () => {
    expect(withBaseIfRootRelative("images/local.png", "/blog")).toBe(
      "images/local.png"
    );
    expect(
      withBaseIfRootRelative("https://example.com/image.png", "/blog")
    ).toBe("https://example.com/image.png");
    expect(withBaseIfRootRelative("//cdn.example.com/image.png", "/blog")).toBe(
      "//cdn.example.com/image.png"
    );
  });
});

describe("Notes nested Markdown lists", () => {
  it("keeps nested bullets inside the second ordered item and continues numbering", async () => {
    const result = await parseEntry({
      id: "2026/10/2026-10-15.md",
      body: [
        "## 14:24",
        "更新博客系统，内容如下：",
        "1. 重构 Notes",
        "2. 评论区调整：",
        "   - **回复**平行显示",
        "   - 默认不展开",
        "   - 统一头像",
        "3. 接入高德",
        "",
        "后续说明",
      ].join("\n"),
    } as never);
    const $ = load(result.timeBlocks[0].text);
    expect($("body > ol")).toHaveLength(1);
    expect($("body > ol > li")).toHaveLength(3);
    expect($("body > ol > li").eq(1).find("ul > li")).toHaveLength(3);
    expect($("ul strong").text()).toBe("回复");
    expect($("body > p").last().text()).toBe("后续说明");
  });
  it("preserves deeper ordered lists, non-one starts and text after a media card", async () => {
    const result = await parseEntry({
      id: "2026/10/2026-10-15.md",
      body: [
        "## 14:24",
        "```card-book",
        "title: 测试",
        "```",
        "",
        "3. 第一层",
        "   1. 第二层",
        "      - 第三层",
        "4. 下一项",
      ].join("\n"),
    } as never);
    const $ = load(result.timeBlocks[0].postText!);
    expect($("body > ol").attr("start")).toBe("3");
    expect($("body > ol > li")).toHaveLength(2);
    expect($("ol ol ul li").text()).toBe("第三层");
  });
});

it("preserves star bullets and Notes footnote tooltips inside lists", async () => {
  const result = await parseEntry({
    id: "2026/10/2026-10-15.md",
    body: "## 14:24\n* 第一项[^1]\n* 第二项\n\n[^1]: 说明",
  } as never);
  const $ = load(result.timeBlocks[0].text);
  expect($("body > ul > li")).toHaveLength(2);
  expect($("li .footnote-tooltip").text()).toBe("说明");
});
