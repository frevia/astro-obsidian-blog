import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const component = () =>
  readFileSync("src/components/reading/ReadingNavigation.astro", "utf-8");
const behavior = () =>
  readFileSync("src/components/reading/reading-navigation.ts", "utf-8");
const styles = () => readFileSync("src/styles/reading-navigation.css", "utf-8");

describe("shared reading navigation", () => {
  it("keeps one data contract for desktop and mobile output", () => {
    const source = component();

    expect(source.match(/data-reading-navigation/g)?.length).toBeGreaterThan(0);
    expect(source).toContain("data-reading-navigation-desktop");
    expect(source).toContain("data-reading-navigation-mobile");
    expect(source).toContain("reading-navigation-mobile-panel--split");
    expect(source).toContain("data-toc-item");
    expect(source).toContain("data-toc-depth");
    expect(source).toContain("data-toc-top-level");
    expect(source).toContain("data-toc-branch");
    expect(source).toContain('String(index + 1).padStart(2, "0")');
    expect(source).toContain('progressLabel = "阅读进度"');
    expect(source).toContain("<span>{progressLabel}</span>");
    expect(source).not.toContain('class="toc-link"');
    expect(source).not.toContain('class="toc-list"');
    expect(source).not.toContain('class="toc-title"');
  });

  it("keeps relations safe and renders relations-only navigation", () => {
    const source = component();

    expect(source).toContain("prepareWikilinkReferences(outgoing)");
    expect(source).toContain("prepareWikilinkReferences(backlinks)");
    expect(source).toContain("safeWikilinkHref(footerLink.href)");
    expect(source).toContain("!hasHeadings && !hasRelations");
    expect(source).toContain("hasRelations && (");
    expect(source).toContain("data-reading-relations");
  });

  it("keeps one lifecycle with cleanup and optional active-link scrolling", () => {
    const source = behavior();

    expect(source).toContain("export function initReadingNavigation");
    expect(source).toContain("scrollActiveIntoView?: boolean");
    expect(source).toContain('doc.addEventListener("scroll"');
    expect(source).toContain('view?.addEventListener("resize"');
    expect(source).toContain('mobileSidebar?.addEventListener("toggle"');
    expect(source).toContain('doc.removeEventListener("scroll"');
    expect(source).toContain('view?.removeEventListener("resize"');
    expect(source).toContain('mobileSidebar?.removeEventListener("toggle"');
    expect(source).toContain(
      'querySelector<HTMLElement>("[data-article-hero]")'
    );
    expect(source).toContain('"is-mobile-reading-active"');
    expect(source).toContain("getBoundingClientRect().bottom");
    expect(source).toContain("mobileSidebar.open = false");
    expect(source).toContain("root.classList.remove(mobileActiveClass)");
  });

  it("defines the shared compact visual geometry", () => {
    const source = styles();

    expect(source).toContain(
      "--reading-nav-accent: var(--page-accent, var(--accent))"
    );
    expect(source).toContain("--reading-nav-accent-soft: color-mix(");
    expect(source).toContain("font-family: var(--font-sans)");
    expect(source).toContain("font-size: 0.69rem");
    expect(source).toContain("line-height: 1.45");
    expect(source).toContain("border-radius: 0.35rem");
    expect(source).toContain("border-inline-start: 1px solid");
    expect(source).toContain("padding-inline: 0");
    expect(source).toContain("border-radius: var(--radius-card)");
    expect(source).toContain("background: var(--surface-glass)");
    expect(source).toContain("visibility: hidden");
    expect(source).toContain("pointer-events: none");
    expect(source).toContain("width: min(11rem, calc(100vw - 2rem))");
    expect(source).toContain(
      ".reading-navigation-shell.is-mobile-reading-active"
    );
    expect(source).toContain("body:not(:has([data-article-hero]))");
    expect(source).toContain("left: 1rem");
    expect(source).toContain("outline: 2px solid var(--focus-ring)");
    expect(source).toContain("body:has(.reading-navigation-desktop)");
    expect(source).toContain("min-height: 2.75rem");
    expect(source).toContain("font-size: 0.8125rem");
    expect(source).toContain("touch-action: manipulation");
    expect(source).toContain("max-height: min(12rem, 24vh)");
    expect(source).toContain("max-height: min(10rem, 22vh)");
    expect(source).toContain("flex: none");
    expect(source).toContain("overflow-y: auto");
    expect(source).toContain("left: calc(50% + 26.5rem)");
    expect(source).toContain("@media (min-width: 1300px)");
    expect(source).toContain(".reading-navigation-mobile-panel--split");
    expect(source).not.toContain(".toc-link");
    expect(source).not.toContain(".toc-list");
  });
});
