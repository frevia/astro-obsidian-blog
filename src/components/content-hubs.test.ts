import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf-8");

describe("content hub presentation contracts", () => {
  it("keeps the tag index concise with separate popular and complete lists", () => {
    const source = read("src/pages/tags/index.astro");

    expect(source).toContain("const allTags =");
    expect(source).toContain('a.tagName.localeCompare(b.tagName, "zh-CN")');
    expect(source).toContain("const popularTags =");
    expect(source).toContain("tagCountMap.get(b.tag)");
    expect(source).toContain(".slice(0, 12)");
    expect(source).toContain('id="popular-tags-title"');
    expect(source).toContain('id="all-tags-title"');
    expect(source).toContain("常用标签");
    expect(source).toContain("全部标签");
    expect(source).toContain("allTags.length === 0");
    expect(source).not.toContain('type="search"');
  });

  it("presents the wiki as an editorial directory", () => {
    const source = read("src/pages/wiki/index.astro");

    expect(source.indexOf('class="wiki-recommendations"')).toBeLessThan(
      source.indexOf('class="wiki-explorer"')
    );
    expect(source).toContain("01 / SELECTED");
    expect(source).toContain("02 / BROWSE");
    expect(source).toContain("wiki-recommendation-feature");
    expect(source).toContain("wiki-recommendation-extensions");
    expect(source).toContain("wiki-directory-list");
    expect(source).toContain('id="wiki-search-input"');
    expect(source).toContain('data-wiki-filter="all"');
    expect(source).toContain('import "@/styles/wiki-index.css"');
    expect(source).toContain("data-wiki-filter={domain.key}");
    expect(source).toContain("data-wiki-entry");
    expect(source).not.toContain("wiki-metrics");
    expect(source).not.toContain("wiki-process");
    expect(source).not.toContain("wiki-highlight-grid");
    expect(source).not.toContain("wiki-card-grid");
    expect(source).toContain("max-w-app");
    expect(source).not.toContain("recent");
  });

  it("keeps home fragment cards aligned without stagger offsets", () => {
    const fragmentCard = read("src/components/home/FragmentPreviewCard.astro");
    const homeEditorial = read("src/components/home/HomeEditorial.astro");

    expect(fragmentCard).not.toContain("sm:mt-8");
    expect(fragmentCard).not.toContain("sm:mb-8");
    expect(fragmentCard).toContain("min-h-72");
    expect(fragmentCard).toContain("sm:min-h-80");
    expect(fragmentCard).toContain("line-clamp-4");
    expect(fragmentCard).toContain("home-lift-card");
    expect(fragmentCard).toContain("Notes");
    expect(fragmentCard).not.toContain("hover:border-accent/55");
    expect(fragmentCard).not.toContain("shadow-sm");
    expect(fragmentCard).not.toContain("index");
    expect(homeEditorial).toContain('presentation="featured"');
    expect(homeEditorial).toContain('href={withBase("/notes")}');
    expect(homeEditorial).toContain("文章与 Notes");
    expect(homeEditorial).not.toContain("fragments.map((preview, index)");
  });

  it("does not widen the existing content hubs", () => {
    expect(read("src/layouts/Main.astro")).toContain("max-w-app");
    expect(read("src/pages/wiki/index.astro")).toContain("max-w-app");
    expect(read("src/pages/index.astro")).toContain("max-w-app");
  });

  it("uses the vibrant palette for editorial decoration", () => {
    const tokens = read("src/styles/design-tokens.css");
    const pageIntro = tokens.slice(
      tokens.indexOf(".page-intro::before"),
      tokens.indexOf(".page-title")
    );

    expect(tokens).toContain("--vibrant-text-gradient");
    expect(tokens).toContain("--vibrant-rail-gradient");
    expect(pageIntro).toContain("var(--vibrant-rail-gradient)");
    expect(pageIntro).toContain("color: var(--accent-strong)");
  });

  it("uses ambient lift instead of a blue hover frame on home cards", () => {
    const card = read("src/components/Card.astro");
    const tokens = read("src/styles/design-tokens.css");

    expect(card).toContain("home-lift-card");
    expect(tokens).toContain(".home-lift-card:hover");
    expect(tokens).toContain("var(--vibrant-secondary) 55%");
    expect(tokens).toContain("transform: translateY(-4px)");
  });
});
