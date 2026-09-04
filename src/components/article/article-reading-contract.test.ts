import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const legacyRailClass = ["article", "reading", "rail"].join("-");

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

  it("uses one shared desktop/mobile reading navigation source", () => {
    const source = readFileSync(
      "src/components/reading/ReadingNavigation.astro",
      "utf-8"
    );

    expect(source).toContain('id="sidebar"');
    expect(source).toContain("reading-navigation-desktop");
    expect(source).toContain("reading-navigation-mobile");
    expect(source).toContain("<details");
    expect(source).toContain("<summary");
    expect(source).toContain("data-toc-link");
    expect(source).toContain("data-toc-progress");
    expect(source).toContain("data-toc-progress-bar");
    expect(source).not.toContain("data-toc-current");
    expect(source).toContain("prepareWikilinkReferences(outgoing)");
    expect(source).toContain("prepareWikilinkReferences(backlinks)");
    expect(source).toContain("data-reading-relations");
    expect(source).toContain("data-reading-navigation");
    expect(source).toContain("hasHeadings && (");
    expect(source).not.toContain('class="toc-link"');
    expect(source).not.toContain('class="toc-list"');
  });

  it("keeps article geometry separate from navigation presentation", () => {
    const articleCss = readFileSync("src/styles/article-reading.css", "utf-8");
    const navigationCss = readFileSync(
      "src/styles/reading-navigation.css",
      "utf-8"
    );

    expect(articleCss).toContain(".article-page");
    expect(articleCss).toMatch(
      /\.article-page\.page-shell::before\s*\{[^}]*inset-block-start:\s*0;/s
    );
    expect(articleCss).toContain("var(--page-accent)");
    expect(articleCss).toContain("var(--page-accent-soft)");
    expect(articleCss).toContain(".article-hero-cover");
    expect(articleCss).toContain("aspect-ratio: 16 / 9");
    expect(articleCss).toContain(".article-reading-body img");
    expect(articleCss).not.toContain(legacyRailClass);

    expect(navigationCss).toContain(
      "--reading-nav-accent: var(--page-accent, var(--accent))"
    );
    expect(navigationCss).toContain("font-size: 0.69rem");
    expect(navigationCss).toContain("line-height: 1.45");
    expect(navigationCss).toContain("border-inline-start: 1px solid");
    expect(navigationCss).toContain("background: transparent");
    expect(navigationCss).toContain("box-shadow: none");
    expect(navigationCss).toContain("max-height: min(12rem, 24vh)");
    expect(navigationCss).toContain("overflow-y: auto");
    expect(navigationCss).toContain("left: calc(50% + 26.5rem)");
    expect(navigationCss).toContain("@media (min-width: 1300px)");
  });
});
