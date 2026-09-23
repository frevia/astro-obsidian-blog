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
