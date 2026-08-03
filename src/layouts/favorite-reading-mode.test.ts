import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = () =>
  readFileSync("src/pages/favorites/[...slug]/index.astro", "utf-8");

describe("favorite reading mode", () => {
  it("uses the shared article reading rail for saved articles", () => {
    const content = source();

    expect(content).toContain(
      'import ArticleHero from "@/components/article/ArticleHero.astro"'
    );
    expect(content).toContain("<ArticleHero");
    expect(content).toContain("showMedia={false}");
    expect(content).toContain(
      'import ArticleReadingRail from "@/components/article/ArticleReadingRail.astro"'
    );
    expect(content).toContain('import "@/styles/article-reading.css"');
    expect(content).toContain(
      "const { Content, headings } = await render(post);"
    );
    expect(content).toContain("const tocHeadings = headings.filter");
    expect(content).toContain("<ArticleReadingRail");
    expect(content).toContain('class="article-reading-body js-toc-content');
    expect(content).not.toContain("tocbot");
  });
});
