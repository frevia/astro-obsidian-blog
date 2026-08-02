import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = () => readFileSync("src/layouts/PostDetails.astro", "utf-8");

describe("post reading mode", () => {
  it("renders the article hero, accent variables, and reading rail as SSR markup", () => {
    const content = source();

    expect(content).toContain(
      'import ArticleHero from "@/components/article/ArticleHero.astro"'
    );
    expect(content).toContain(
      'import ArticleReadingRail from "@/components/article/ArticleReadingRail.astro"'
    );
    expect(content).toContain('import "@/styles/article-reading.css"');
    expect(content).toContain("getArticleAccentStyle");
    expect(content).toContain('"article-page mx-auto');
    expect(content).toContain("<ArticleHero");
    expect(content).toContain("<ArticleReadingRail");
    expect(content).toContain('class="article-reading-body js-toc-content');
  });

  it("keeps transition names deterministic and distinct for title and cover", () => {
    const content = source();

    expect(content).toContain(
      "const titleTransitionName = toTransitionName(title);"
    );
    expect(content).toContain(
      "const coverTransitionName = `${titleTransitionName}-cover`;"
    );
    expect(content).toContain('estimateReadingMinutes(post.body ?? "")');
  });

  it("keeps existing server TOC and code-toolbar hooks in the lifecycle", () => {
    const content = source();

    expect(content).toContain('"#sidebar [data-toc-link]"');
    expect(content).toContain("main.querySelectorAll<HTMLButtonElement>(");
    expect(content).toContain("window.__postDetailsCleanup?.()");
  });
});
