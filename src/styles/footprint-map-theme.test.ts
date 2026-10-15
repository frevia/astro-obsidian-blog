import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const stylesheet = readFileSync(
  resolve(import.meta.dirname, "footprint-map.css"),
  "utf8"
);

describe("footprint AMap theme", () => {
  it("follows the site's data-theme contract for dark mode", () => {
    expect(stylesheet).toContain('html[data-theme="dark"] .footprint-amap');
    expect(stylesheet).not.toContain(".dark .footprint-amap");
  });

  it("keeps vector canvas rendering native and the map background theme-aware", () => {
    expect(stylesheet).toContain(".footprint-amap .amap-info-content");
    expect(stylesheet).toContain("background: var(--footprint-map-background)");
    expect(stylesheet).not.toContain("footprint-map-tile-filter");
    expect(stylesheet).not.toContain(".leaflet-tile-pane");
    expect(stylesheet).not.toContain("invert(");
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
