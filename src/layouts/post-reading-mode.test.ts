import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = () => readFileSync("src/layouts/PostDetails.astro", "utf-8");
const readingStyles = () =>
  readFileSync("src/styles/article-reading.css", "utf-8");
const navigationSource = () =>
  readFileSync("src/components/reading/reading-navigation.ts", "utf-8");
const legacyRailClass = ["article", "reading", "rail"].join("-");

describe("post reading mode", () => {
  it("renders the article hero, accent variables, and shared navigation as SSR markup", () => {
    const content = source();

    expect(content).toContain(
      'import ArticleHero from "@/components/article/ArticleHero.astro"'
    );
    expect(content).toContain(
      'import ReadingNavigation from "@/components/reading/ReadingNavigation.astro"'
    );
    expect(content).toContain('import "@/styles/article-reading.css"');
    expect(content).toContain("getArticleAccentStyle");
    expect(content).toContain('"article-page page-shell mx-auto');
    expect(content).toContain("<ArticleHero");
    expect(content).toContain("<ReadingNavigation");
    expect(content).toContain("hasReadingNavigation && (");
    expect(content).toContain("outgoing={outgoingWikilinks}");
    expect(content).toContain(
      "relationsTitle={postDetailsLabels.wikilinksTitle}"
    );
    expect(content).not.toContain("<WikilinkPanel");
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

  it("keeps shared navigation and code-toolbar hooks in the lifecycle", () => {
    const content = source();
    const navigation = navigationSource();

    expect(navigation).toContain("[data-toc-link]");
    expect(content).toContain("main.querySelectorAll<HTMLButtonElement>(");
    expect(content).toContain("window.__postDetailsCleanup?.()");
  });

  it("lets the article body use the page container's available width", () => {
    const styles = readingStyles();

    expect(styles).toMatch(
      /@media \(min-width: 1024px\)[\s\S]*?\.article-reading-body\s*\{[\s\S]*?width:\s*100%;[\s\S]*?max-width:\s*none;/
    );
    expect(styles).not.toContain("max-width: 44rem");
    expect(styles).not.toContain(legacyRailClass);
  });
});
