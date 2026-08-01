import { describe, expect, it, vi } from "vitest";

import {
  normalizeRssHtml,
  renderRssContent,
  toAbsoluteRssUrl,
} from "./rssContent";

const site = "https://example.com/";
const base = "/blog";

describe("toAbsoluteRssUrl", () => {
  it("normalizes root-relative and base-prefixed site URLs to the configured site base", () => {
    expect(toAbsoluteRssUrl("/posts/hello", site, base)).toBe(
      "https://example.com/blog/posts/hello"
    );
    expect(toAbsoluteRssUrl("/blog/posts/hello", site, base)).toBe(
      "https://example.com/blog/posts/hello"
    );
    expect(toAbsoluteRssUrl("posts/hello", site, base)).toBe(
      "https://example.com/blog/posts/hello"
    );
  });

  it("leaves absolute, protocol-relative, special-scheme, and hash URLs unchanged", () => {
    expect(toAbsoluteRssUrl("https://cdn.example.com/a.png", site, base)).toBe(
      "https://cdn.example.com/a.png"
    );
    expect(toAbsoluteRssUrl("//cdn.example.com/a.png", site, base)).toBe(
      "//cdn.example.com/a.png"
    );
    expect(toAbsoluteRssUrl("mailto:x@example.com", site, base)).toBe(
      "mailto:x@example.com"
    );
    expect(toAbsoluteRssUrl("tel:+123456", site, base)).toBe("tel:+123456");
    expect(toAbsoluteRssUrl("data:image/png;base64,abc", site, base)).toBe(
      "data:image/png;base64,abc"
    );
    expect(toAbsoluteRssUrl("#section", site, base)).toBe("#section");
  });
});

describe("normalizeRssHtml", () => {
  it("uses Cheerio fragment mode and does not inject document wrappers", async () => {
    const html = await normalizeRssHtml("<p>Hello</p><p>World</p>", {
      site,
      base,
    });

    expect(html).toBe("<p>Hello</p><p>World</p>");
    expect(html).not.toContain("<html");
    expect(html).not.toContain("<body");
  });

  it("absolutizes site-relative links and image sources against the site base", async () => {
    const optimizeImage = vi.fn(async (imagePath: string) => ({
      thumbnail: imagePath,
      width: 640,
      height: 480,
    }));

    const html = await normalizeRssHtml(
      '<a href="/posts/a">A</a><a href="/blog/posts/b">B</a><img src="attachment/photo.jpg" alt="Photo">',
      {
        site,
        base,
        optimizeImage,
      }
    );

    expect(optimizeImage).toHaveBeenCalledWith("attachment/photo.jpg", {
      thumbnailSize: 900,
    });
    expect(html).toContain('href="https://example.com/blog/posts/a"');
    expect(html).toContain('href="https://example.com/blog/posts/b"');
    expect(html).toContain(
      'src="https://example.com/blog/attachment/photo.jpg"'
    );
    expect(html).toContain('width="640"');
    expect(html).toContain('height="480"');
  });

  it("falls back to the original image URL when attachment optimization fails", async () => {
    const optimizeImage = vi.fn(async () => {
      throw new Error("missing image");
    });

    const html = await normalizeRssHtml(
      '<p><img src="attachment/missing.jpg" alt="Missing"></p>',
      { site, base, optimizeImage }
    );

    expect(optimizeImage).toHaveBeenCalledWith("attachment/missing.jpg", {
      thumbnailSize: 900,
    });
    expect(html).toContain(
      'src="https://example.com/blog/attachment/missing.jpg"'
    );
    expect(html).not.toContain('width="');
    expect(html).not.toContain('height="');
  });

  it("applies an explicit HTML tag and attribute allowlist while preserving semantic code", async () => {
    const html = await normalizeRssHtml(
      '<section onclick="evil()" style="color:red" data-x="1"><script>alert(1)</script><style>p{}</style><iframe src="/x"></iframe><form action="/post"><button formaction="/post">Go</button></form><meta http-equiv="refresh" content="0;url=https://evil.example"><svg><text>svg</text></svg><a href=" javascript:alert(1)">bad</a><img src="vbscript:evil" onerror="evil()"><video poster="/poster.jpg"></video><pre data-language="ts"><code><span>const x = 1;</span></code></pre></section>',
      { site, base }
    );

    expect(html).not.toContain("<script");
    expect(html).not.toContain("<style");
    expect(html).not.toContain("<iframe");
    expect(html).not.toContain("<form");
    expect(html).not.toContain("<meta");
    expect(html).not.toContain("<svg");
    expect(html).not.toContain("onclick");
    expect(html).not.toContain("style=");
    expect(html).not.toContain("data-x");
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("vbscript:");
    expect(html).not.toContain("poster=");
    expect(html).not.toContain("formaction=");
    expect(html).not.toContain("<video");
    expect(html).toContain("<section>");
    expect(html).toContain(
      '<pre data-language="ts"><code><span>const x = 1;</span></code></pre>'
    );
  });

  it("sanitizes URL attributes by element context", async () => {
    const html = await normalizeRssHtml(
      '<p><a href="https://safe.example/a">safe</a><a href="file:///etc/passwd">file</a><a href="data:text/html,evil">data</a><a href="/posts/local">local</a><img src="data:image/png;base64,abc" alt="inline"><img src="data:text/html,evil" alt="bad"><img srcset="/a.jpg 1x, https://cdn.example/b.jpg 2x, javascript:evil 3x" src="/fallback.jpg" alt="srcset"></p>',
      { site, base }
    );

    expect(html).toContain('href="https://safe.example/a"');
    expect(html).toContain('href="https://example.com/blog/posts/local"');
    expect(html).not.toContain("file:///etc/passwd");
    expect(html).not.toContain("data:text/html");
    expect(html).toContain('src="data:image/png;base64,abc"');
    expect(html).toContain(
      'srcset="https://example.com/blog/a.jpg 1x, https://cdn.example/b.jpg 2x"'
    );
    expect(html).toContain('src="https://example.com/blog/fallback.jpg"');
  });

  it("filters srcset candidates without treating commas inside data URIs as relative URLs", async () => {
    const html = await normalizeRssHtml(
      '<img srcset="data:image/svg+xml,%3Csvg%3E,%3C/svg%3E 1x, /safe.jpg 2x, https://cdn.example/photo.jpg 3x" src="/fallback.jpg" alt="srcset">',
      { site, base }
    );

    expect(html).toContain(
      'srcset="https://example.com/blog/safe.jpg 2x, https://cdn.example/photo.jpg 3x"'
    );
    expect(html).not.toContain("data:image");
    expect(html).not.toContain("%3C/svg%3E");
  });

  it("keeps readable math text and aria labels", async () => {
    const html = await normalizeRssHtml(
      '<span class="katex" aria-label="x squared"><span aria-hidden="true">x²</span></span>',
      { site, base }
    );

    expect(html).toContain('aria-label="x squared"');
    expect(html).toContain("x²");
  });

  it("converts Astro image markers to optimized absolute image URLs without dropping the image", async () => {
    const optimizeImage = vi.fn(async () => ({
      thumbnail: "/_astro/photo.hash.webp",
      width: 1200,
      height: 800,
    }));
    const astroImage = JSON.stringify({
      src: "../attachment/photo.jpg",
      alt: "A photo",
    }).replace(/"/g, "&quot;");

    const html = await normalizeRssHtml(
      `<p><img __ASTRO_IMAGE_="${astroImage}"></p>`,
      { site, base, optimizeImage }
    );

    expect(optimizeImage).toHaveBeenCalledWith("../attachment/photo.jpg", {
      thumbnailSize: 900,
    });
    expect(html).toContain(
      'src="https://example.com/blog/_astro/photo.hash.webp"'
    );
    expect(html).toContain('alt="A photo"');
    expect(html).toContain('width="1200"');
    expect(html).toContain('height="800"');
    expect(html).not.toContain("__ASTRO_IMAGE_");
  });
});

describe("renderRssContent", () => {
  it("preserves Sätteri/KaTeX MathML semantics for RSS markdown math", async () => {
    const html = await renderRssContent(
      { markdown: "$E=mc^2$" },
      { site, base }
    );

    expect(html).toContain("<math");
    expect(html).toContain("<semantics>");
    expect(html).toContain("<annotation");
    expect(html).toContain('encoding="application/x-tex"');
    expect(html).toContain("E=mc^2");
    expect(html).toContain("<msup>");
    expect(html).not.toMatch(/E=mc\^2\s*E=mc\^2\s*E=mc\^2/);
  });

  it("prefers rendered HTML and does not call the fallback renderer", async () => {
    const renderMarkdown = vi.fn(async () => "<p>fallback</p>");

    const html = await renderRssContent(
      {
        renderedHtml: '<a href="/posts/rendered">Rendered</a>',
        markdown: "[Fallback](/posts/fallback)",
      },
      { site, base, renderMarkdown }
    );

    expect(renderMarkdown).not.toHaveBeenCalled();
    expect(html).toContain('href="https://example.com/blog/posts/rendered"');
  });

  it("falls back to the RSS markdown renderer when rendered HTML is missing", async () => {
    const renderMarkdown = vi.fn(
      async () => '<a href="/posts/fallback">Fallback</a>'
    );

    const html = await renderRssContent(
      { markdown: "[Fallback](/posts/fallback)" },
      { site, base, renderMarkdown, fileURL: new URL("file:///tmp/post.md") }
    );

    expect(renderMarkdown).toHaveBeenCalledWith("[Fallback](/posts/fallback)", {
      fileURL: new URL("file:///tmp/post.md"),
    });
    expect(html).toContain('href="https://example.com/blog/posts/fallback"');
  });
});
