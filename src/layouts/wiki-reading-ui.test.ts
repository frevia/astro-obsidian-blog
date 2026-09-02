import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const legacyTocClass = ["wiki", "rail", "toc"].join("-");
const legacyRelationsClass = ["wiki", "rail", "relations"].join("-");
const legacyInitializer = ["init", "Article", "Reading", "Rail"].join("");

describe("wiki reading UI", () => {
  it("keeps the editorial directory typography readable", () => {
    const source = readFileSync("src/styles/wiki-index.css", "utf-8");

    expect(source).toContain("line-height: 1.15");
    expect(source).toContain("text-wrap: balance");
    expect(source).toContain(".wiki-directory-row");
    expect(source).not.toContain(".wiki-metrics");
    expect(source).not.toContain(".wiki-process");
    expect(source).not.toContain(".wiki-highlight-grid");
    expect(source).not.toContain(".wiki-card-grid");
  });

  it("uses the shared long-form reading navigation", () => {
    const source = readFileSync("src/layouts/WikiDetails.astro", "utf-8");
    const navigation = readFileSync(
      "src/components/reading/ReadingNavigation.astro",
      "utf-8"
    );

    expect(source).toContain('class="app-prose article-reading-body');
    expect(source).toContain("max-width: 50rem");
    expect(source).toContain("<ReadingNavigation");
    expect(source).not.toContain("scrollActiveIntoView={false}");
    expect(source).not.toContain(legacyTocClass);
    expect(source).not.toContain(legacyRelationsClass);
    expect(source).not.toContain(legacyInitializer);
    expect(source).not.toContain("wiki-rail-current");
    expect(source).not.toContain("data-toc-current");
    expect(navigation).toContain("footerLink");
    expect(navigation).toContain("data-reading-relations");
  });

  it("uses the shared title accent without a floating back button", () => {
    const indexSource = readFileSync("src/pages/wiki/index.astro", "utf-8");
    const detailsSource = readFileSync(
      "src/layouts/WikiDetails.astro",
      "utf-8"
    );
    const indexStyles = readFileSync("src/styles/wiki-index.css", "utf-8");

    expect(indexSource).not.toContain("BackButton");
    expect(detailsSource).not.toContain("BackButton");
    expect(indexSource).toContain('import "@/styles/wiki-index.css"');
    expect(indexStyles).toContain(".wiki-hero-copy::before");
    expect(detailsSource).toContain(".wiki-entry-heading::before");
  });
});
