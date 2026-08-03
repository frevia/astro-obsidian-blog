import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const stylesheet = readFileSync(
  resolve(import.meta.dirname, "footprint-leaflet.css"),
  "utf8"
);

describe("footprint Leaflet theme", () => {
  it("follows the site's data-theme contract for dark mode", () => {
    expect(stylesheet).toContain(
      'html[data-theme="dark"] .footprint-leaflet-map'
    );
    expect(stylesheet).not.toContain(".dark .footprint-leaflet-map");
  });

  it("keeps tile filtering and map background theme-aware", () => {
    expect(stylesheet).toContain("--footprint-map-tile-filter");
    expect(stylesheet).toContain("filter: var(--footprint-map-tile-filter)");
    expect(stylesheet).toContain("background: var(--footprint-map-background)");
  });

  it("keeps selected markers on the footprint accent", () => {
    const selectedMarkerRule = stylesheet.match(
      /\.footprint-marker-icon\.is-selected\s*\{([\s\S]*?)\}/
    )?.[1];
    expect(selectedMarkerRule).toContain(
      "transform: translateY(-2px) scale(1.1)"
    );
    expect(stylesheet).toContain(".footprint-marker-pin-body");
    expect(stylesheet).toContain(".footprint-marker-pin-base");
    expect(stylesheet).toContain(".footprint-marker-pin-hole");
    expect(stylesheet).toContain(".footprint-popup-post-image");
  });
});
