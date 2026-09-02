import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/components/home/HomeEditorial.astro", "utf-8");
const home = readFileSync("src/pages/index.astro", "utf-8");

describe("home knowledge highlights", () => {
  it("renders the selected concepts as one lead and secondary reading list", () => {
    expect(source).toContain("wikiHighlights?: WikiCatalogItem[]");
    expect(source).toContain("wikiHighlights = []");
    expect(source).toContain("home-wiki-editorial");
    expect(source).toContain("home-wiki-lead");
    expect(source).toContain("home-wiki-followups");
    expect(source).toContain("wikiHighlights[0]");
    expect(source).toContain("wikiHighlights.slice(1)");
    expect(source).toContain('id="home-wiki-heading"');
    expect(source).toContain("{item.domain.label}");
    expect(source).toContain("{item.relations} 个知识连接");
    expect(source).not.toContain("home-wiki-highlight");
    expect(source).not.toContain("rounded-xl border");
  });

  it("provides the full wiki entry point and passes selected concepts from home", () => {
    expect(source).toContain('href={withBase("/wiki")}');
    expect(source).toContain("浏览全部知识");
    expect(home).toContain("buildWikiCatalog");
    expect(home).toContain("selectWikiHighlights");
    expect(home).toContain("{wikiHighlights}");
  });
});
