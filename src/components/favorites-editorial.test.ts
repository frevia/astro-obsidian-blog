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
    expect(source).toContain("Latest capture");
    expect(source).toContain("data-content-kind={getFavoriteKind(post)}");
  });

  it("keeps tag filter buttons outside the favorite navigation link", () => {
    expect(source).toContain('class="favorites-item-foot"');
    expect(source).toContain('data-action="filter-tag"');
    expect(source).toContain("</a>");
  });
});
