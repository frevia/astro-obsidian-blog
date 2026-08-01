import { getRssString } from "@astrojs/rss";
import { XMLParser } from "../../node_modules/.pnpm/fast-xml-parser@5.10.1/node_modules/fast-xml-parser";
import { describe, expect, it } from "vitest";

import {
  createRssChannelImage,
  createRssEnclosure,
  getCoverImageUrl,
} from "./rssFeed";

describe("RSS feed XML helpers", () => {
  it("returns XML-safe absolute channel image data", async () => {
    const xml = await getRssString({
      title: "A&B <Blog>",
      description: "Posts & notes",
      site: "https://example.com/blog",
      items: [
        {
          title: "Fish & Chips <Tasty>",
          description: "A < B & C",
          link: "https://example.com/blog/posts/a?x=1&y=2",
        },
      ],
      customData: createRssChannelImage({
        site: "https://example.com/",
        base: "/blog",
        title: "A&B <Blog>",
        favicon: "favicon.png",
      }),
    });

    expect(xml).toContain("<url>https://example.com/blog/favicon.png</url>");
    expect(xml).toContain("<title>A&amp;B &lt;Blog&gt;</title>");
    expect(xml).toContain(
      "<link>https://example.com/blog/posts/a?x=1&amp;y=2</link>"
    );
    expect(xml).toContain("<title>Fish &amp; Chips &lt;Tasty&gt;</title>");
  });

  it("omits empty enclosures and absolutizes valid image enclosures", () => {
    expect(
      createRssEnclosure("", "https://example.com/", "/blog")
    ).toBeUndefined();
    expect(
      createRssEnclosure("/_astro/cover.webp", "https://example.com/", "/blog")
    ).toEqual({
      url: "https://example.com/blog/_astro/cover.webp",
      type: "image/webp",
      length: 0,
    });
    expect(
      createRssEnclosure(
        "//cdn.example.com/cover.jpg",
        "https://example.com/",
        "/blog"
      )
    ).toEqual({
      url: "https://cdn.example.com/cover.jpg",
      type: "image/jpeg",
      length: 0,
    });

    for (const unsafeUrl of [
      "javascript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "file:///etc/passwd",
      "http://[invalid",
    ]) {
      expect(
        createRssEnclosure(unsafeUrl, "https://example.com/", "/blog")
      ).toBeUndefined();
    }
  });

  it("optimizes string covers and falls back to the original cover when optimization fails", async () => {
    const optimizeImage = async () => ({
      thumbnail: "/_astro/cover.webp",
    });

    await expect(getCoverImageUrl("cover.jpg", optimizeImage)).resolves.toBe(
      "/_astro/cover.webp"
    );
    await expect(
      getCoverImageUrl("cover.jpg", async () => {
        throw new Error("missing cover");
      })
    ).resolves.toBe("cover.jpg");
  });

  it("returns object cover src and undefined for empty covers", async () => {
    await expect(
      getCoverImageUrl({ src: "/_astro/object-cover.webp" })
    ).resolves.toBe("/_astro/object-cover.webp");
    await expect(getCoverImageUrl(undefined)).resolves.toBeUndefined();
  });

  it("keeps RSS XML parseable when encoded content contains a CDATA terminator", async () => {
    const xml = await getRssString({
      title: "Blog",
      description: "Posts",
      site: "https://example.com/blog",
      items: [
        {
          title: "CDATA",
          description: "CDATA edge case",
          link: "https://example.com/blog/posts/cdata",
          content: "<p>before ]]> after</p>",
        },
      ],
    });

    expect(() => new XMLParser().parse(xml)).not.toThrow();
    expect(xml).toContain("]]&gt;");
  });
});
