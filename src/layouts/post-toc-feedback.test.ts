import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("post TOC visibility and active feedback", () => {
  it("keeps sidebar visibility state in sync with TOC content", () => {
    const source = readFileSync("src/layouts/PostDetails.astro", "utf-8");

    expect(source).toContain(
      'const hasTocItem =\n        tocContainer.querySelector(".toc-list-item, .toc-link") !== null;'
    );
    expect(source).toContain('sidebar.classList.toggle("toc-empty", !hasTocItem);');
    expect(source).toContain('sidebar.setAttribute("aria-hidden", String(!hasTocItem));');
  });

  it("provides stronger active-state visual feedback for current TOC entry", () => {
    const css = readFileSync("src/styles/global.css", "utf-8");

    expect(css).toContain(".toc-link.is-active-link");
    expect(css).toContain("@apply text-accent font-semibold");
    expect(css).toContain("border-left: 2px solid var(--accent)");
  });
});
