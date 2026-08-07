import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("post TOC visibility and active feedback", () => {
  it("renders post heading metadata through the shared navigation", () => {
    const source = readFileSync("src/layouts/PostDetails.astro", "utf-8");
    const navigation = readFileSync(
      "src/components/reading/ReadingNavigation.astro",
      "utf-8"
    );
    const navigationLogic = readFileSync(
      "src/components/reading/reading-navigation.ts",
      "utf-8"
    );

    expect(source).toContain(
      "const { Content, headings } = await render(post);"
    );
    expect(source).toContain("const tocHeadings = headings.filter");
    expect(source).toContain("<ReadingNavigation");
    expect(source).toContain("outgoing={outgoingWikilinks}");
    expect(navigation).toContain("href={`#${heading.slug}`}");
    expect(navigation).toContain("{heading.text}");
    expect(navigation).toContain("data-toc-item");
    expect(navigation).toContain("data-toc-depth");
    expect(navigationLogic).toContain("dataset.tocTopLevel");
    expect(source).not.toContain('import tocbot from "tocbot"');
    expect(source).not.toContain("tocbot.init");
  });

  it("progressively marks the current shared TOC link", () => {
    const source = readFileSync(
      "src/components/reading/reading-navigation.ts",
      "utf-8"
    );

    expect(source).toContain("data-reading-navigation-desktop");
    expect(source).toContain("data-reading-navigation-mobile");
    expect(source).toContain(
      'link.classList.toggle("is-active-link", isActive)'
    );
    expect(source).toContain('"[data-toc-progress-bar]"');
    expect(source).not.toContain('"[data-toc-current]"');
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
