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
