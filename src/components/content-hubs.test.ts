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

  it("places wiki exploration before the process explanation", () => {
    const source = read("src/pages/wiki/index.astro");

    expect(source.indexOf('class="wiki-explorer"')).toBeLessThan(
      source.indexOf('class="wiki-process"')
    );
    expect(source).toContain("01 / EXPLORE");
    expect(source).toContain("02 / PROCESS");
    expect(source).toContain('id="wiki-search-input"');
    expect(source).toContain('data-wiki-filter="all"');
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
    expect(fragmentCard).not.toContain("index");
    expect(homeEditorial).toContain('presentation="featured"');
    expect(homeEditorial).not.toContain("fragments.map((preview, index)");
  });

  it("does not widen the existing content hubs", () => {
    expect(read("src/layouts/Main.astro")).toContain("max-w-app");
    expect(read("src/pages/wiki/index.astro")).toContain("max-w-app");
    expect(read("src/pages/index.astro")).toContain("max-w-app");
  });
});
