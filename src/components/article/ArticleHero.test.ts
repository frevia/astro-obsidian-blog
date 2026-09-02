import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = () =>
  readFileSync("src/components/article/ArticleHero.astro", "utf-8");

describe("article hero presentation", () => {
  it("uses the editorial description for the hero excerpt", () => {
    const hero = source();

    expect(hero).toContain("summary?: string;");
    expect(hero).toContain("const excerpt = description.trim();");
    expect(hero).not.toContain("summary?.trim()");
    expect(hero).toContain("{excerpt}");
    expect(hero).toContain("data-article-hero");
  });
});
