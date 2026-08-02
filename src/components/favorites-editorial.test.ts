import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("../pages/favorites/index.astro", import.meta.url),
  "utf-8"
);

describe("favorites editorial catalog", () => {
  it("exposes a curated masthead and a live filter summary", () => {
    expect(source).toContain('class="favorites-masthead');
    expect(source).toContain('id="favorites-filter-status"');
    expect(source).toContain("最近收录");
    expect(source).toContain("data-content-kind={getFavoriteKind(post)}");
  });

  it("keeps tag filter buttons outside the favorite navigation link", () => {
    expect(source).toContain('class="favorites-item-foot"');
    expect(source).toContain('data-action="filter-tag"');
    expect(source).toContain("</a>");
  });

  it("supports hiding the filter toolbar while scrolling", () => {
    expect(source).toContain(".favorites-toolbar.is-scroll-hidden");
    expect(source).toContain("requestAnimationFrame(updateToolbarVisibility)");
    expect(source).toContain("if (scrollDelta < -8) setToolbarHidden(false)");
  });

  it("keeps toolbar collapse out of the browser scroll-anchor loop", () => {
    expect(source).toMatch(
      /\.favorites-catalog \{[\s\S]*?overflow-anchor: none;/
    );
    expect(source).not.toContain("window.scrollBy");
  });
});
