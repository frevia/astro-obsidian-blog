import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("article reading presentation contracts", () => {
  it("keeps the hero metadata and shared transition hooks server-rendered", () => {
    const source = readFileSync(
      "src/components/article/ArticleHero.astro",
      "utf-8"
    );

    expect(source).toContain("article-hero");
    expect(source).toContain("article-hero-category");
    expect(source).toContain("article-hero-title");
    expect(source).toContain("article-hero-summary");
    expect(source).toContain("article-hero-reading-time");
    expect(source).toContain("article-hero-cover");
    expect(source).toContain("transition:name={titleTransitionName}");
    expect(source).toContain("transition:name={coverTransitionName}");
    expect(source).toContain('loading="eager"');
  });

  it("exposes both a desktop chapter rail and a keyboard-reachable mobile TOC", () => {
    const source = readFileSync(
      "src/components/article/ArticleReadingRail.astro",
      "utf-8"
    );

    expect(source).toContain('id="sidebar"');
    expect(source).toContain("article-reading-rail");
    expect(source).toContain("article-reading-rail-card");
    expect(source).toContain("article-reading-rail-mobile");
    expect(source).toContain("<details");
    expect(source).toContain("<summary");
    expect(source).toContain("data-toc-link");
    expect(source).toContain("data-toc-progress");
    expect(source).toContain("data-toc-progress-bar");
    expect(source).toContain("data-toc-current");
    expect(source).toContain('aria-labelledby="post-toc-title"');
  });

  it("keeps article reading geometry and page-accent styles local", () => {
    const css = readFileSync("src/styles/article-reading.css", "utf-8");

    expect(css).toContain(".article-page");
    expect(css).toContain("var(--page-accent)");
    expect(css).toContain("var(--page-accent-soft)");
    expect(css).toContain(".article-hero-cover");
    expect(css).toContain("aspect-ratio: 16 / 9");
    expect(css).toContain(".article-reading-rail-mobile");
    expect(css).toContain(".article-reading-rail-card");
    expect(css).toContain(".article-reading-rail-progress-track");
    expect(css).toContain("@media (min-width: 1300px)");
    expect(css).toContain("position: fixed");
    expect(css).toContain(".article-reading-body img");
    for (const component of [
      "content-block--pullquote",
      "content-block--gallery",
      "content-block--timeline",
      "content-block--aside",
      "content-block--stats",
      "content-block--map",
    ]) {
      expect(css).toContain(`.${component}`);
    }
  });
});
