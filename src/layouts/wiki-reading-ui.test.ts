import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const legacyTocClass = ["wiki", "rail", "toc"].join("-");
const legacyRelationsClass = ["wiki", "rail", "relations"].join("-");
const legacyInitializer = ["init", "Article", "Reading", "Rail"].join("");

describe("wiki reading UI", () => {
  it("keeps the process title readable when its column wraps", () => {
    const source = readFileSync("src/pages/wiki/index.astro", "utf-8");

    expect(source).toContain("line-height: 1.15");
    expect(source).toContain("white-space: nowrap");
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

    expect(indexSource).not.toContain("BackButton");
    expect(detailsSource).not.toContain("BackButton");
    expect(indexSource).toContain(".wiki-hero-copy::before");
    expect(detailsSource).toContain(".wiki-entry-heading::before");
  });
});
