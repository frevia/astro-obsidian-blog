import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("post TOC visibility and active feedback", () => {
  it("renders post heading metadata as static TOC links", () => {
    const source = readFileSync("src/layouts/PostDetails.astro", "utf-8");
    const rail = readFileSync(
      "src/components/article/ArticleReadingRail.astro",
      "utf-8"
    );
    const railLogic = readFileSync(
      "src/components/article/article-reading-rail.ts",
      "utf-8"
    );

    expect(source).toContain(
      "const { Content, headings } = await render(post);"
    );
    expect(source).toContain("const tocHeadings = headings.filter");
    expect(rail).toContain("href={`#${heading.slug}`}");
    expect(rail).toContain("{heading.text}");
    expect(rail).toContain("data-toc-item");
    expect(rail).toContain("data-toc-depth");
    expect(rail).toContain("initArticleReadingRail");
    expect(railLogic).toContain("dataset.tocTopLevel");
    expect(source).not.toContain('import tocbot from "tocbot"');
    expect(source).not.toContain("tocbot.init");
  });

  it("provides stronger active-state visual feedback for current TOC entry", () => {
    const css = readFileSync("src/styles/global.css", "utf-8");
    const articleCss = readFileSync("src/styles/article-reading.css", "utf-8");

    expect(css).toContain(".toc-link.is-active-link");
    expect(css).toContain("@apply text-accent font-semibold");
    expect(css).toContain("border-left: 2px solid var(--accent)");
    expect(articleCss).toContain(".article-reading-rail-card");
    expect(articleCss).toContain(".article-reading-rail-progress-track");
  });

  it("progressively marks the current static TOC link", () => {
    const source = readFileSync(
      "src/components/article/article-reading-rail.ts",
      "utf-8"
    );

    expect(source).toContain("doc.querySelectorAll<HTMLAnchorElement>(");
    expect(source).toContain('"#sidebar [data-toc-link]"');
    expect(source).toContain(
      'link.classList.toggle("is-active-link", isActive)'
    );
    expect(source).toContain('"[data-toc-progress-bar]"');
    expect(source).toContain('"[data-toc-current]"');
    expect(source).toContain('"--toc-progress"');
    expect(source).toContain("entry.tocItem.hidden = !visible");
    expect(source).toContain("entry.link.scrollIntoView");
    expect(source).toContain('link.setAttribute("aria-current", "location")');
    expect(source).toContain('link.removeAttribute("aria-current")');
  });

  it("enhances build-time code toolbar buttons without moving code in the DOM", () => {
    const source = readFileSync("src/layouts/PostDetails.astro", "utf-8");

    expect(source).toContain("main.querySelectorAll<HTMLButtonElement>(");
    expect(source).toContain("'[data-copy-button=\"true\"]'");
    expect(source).toContain("copyButton.textContent = copyLabel");
    expect(source).toContain("copyButton.hidden = false");
    expect(source).toContain("navigator.clipboard.writeText(text)");
    expect(source).not.toContain("wrapper.appendChild(pre)");
    expect(source).not.toContain("parent.insertBefore(wrapper, nextSibling)");
  });

  it("cleans up post-only listeners across ClientRouter navigation", () => {
    const source = readFileSync("src/layouts/PostDetails.astro", "utf-8");

    expect(source).toContain("window.__postDetailsCleanup?.()");
    expect(source).toContain(
      'document.removeEventListener("scroll", onScroll)'
    );
    expect(source).toContain('document.addEventListener("astro:before-swap"');
    expect(source).toContain("if (!window.__postDetailsLifecycleBound)");
  });
});
