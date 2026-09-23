import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/components/home/HomeEditorial.astro", "utf-8");
const home = readFileSync("src/pages/index.astro", "utf-8");

describe("home knowledge highlights", () => {
  it("keeps selected concepts concise and consistent with home cards", () => {
    expect(source).toContain("wikiHighlights?: WikiCatalogItem[]");
    expect(source).toContain("wikiHighlights = []");
    expect(source).toContain("wikiHighlights.length > 0");
    expect(source).toContain("wikiHighlights.map(item");
    expect(source).toContain('id="home-wiki-heading"');
    expect(source).toContain("home-lift-card");
    expect(source).toContain("{item.domain.label}");
    expect(source).toContain("{item.title}");
    expect(source).not.toContain("item.description");
    expect(source).not.toContain("item.relations");
    expect(source).not.toContain("home-wiki-lead");
  });

  it("provides the full wiki entry point and passes selected concepts from home", () => {
    expect(source).toContain('href={withBase("/wiki")}');
    expect(source).toContain("浏览全部知识");
    expect(home).toContain("buildWikiCatalog");
    expect(home).toContain("selectWikiHighlights");
    expect(home).toContain("{wikiHighlights}");
  });
});
