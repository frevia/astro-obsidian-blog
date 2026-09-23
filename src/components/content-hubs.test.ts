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

  it("keeps the wiki browse-first without repeating concept descriptions", () => {
    const source = read("src/pages/wiki/index.astro");

    expect(source.indexOf('class="wiki-domains"')).toBeLessThan(
      source.indexOf('class="wiki-explorer"')
    );
    expect(source).toContain("wiki-directory-list");
    expect(source).toContain('id="wiki-search-input"');
    expect(source).toContain('data-wiki-filter="all"');
    expect(source).toContain("data-wiki-filter={domain.key}");
    expect(source).toContain('aria-pressed="false"');
    expect(source).toContain("data-wiki-entry");
    // Descriptions remain searchable, but no longer fill the browse surface.
    expect(source).toContain("${item.title} ${item.description}");
    expect(source).not.toContain("<span>{item.description}</span>");
    expect(source).not.toContain("wiki-recommendations");
    expect(source).not.toContain("domain.description");
    expect(source).toContain("max-w-app");
  });

  it("lets short home fragments keep their natural height", () => {
    const fragmentCard = read("src/components/home/FragmentPreviewCard.astro");
    const homeEditorial = read("src/components/home/HomeEditorial.astro");

    expect(fragmentCard).not.toContain("sm:mt-8");
    expect(fragmentCard).not.toContain("sm:mb-8");
    expect(fragmentCard).not.toMatch(/min-h-|h-full.*flex-col|mt-auto/);
    expect(homeEditorial).toContain("grid items-start gap-4");
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
