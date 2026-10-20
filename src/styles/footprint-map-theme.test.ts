import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const stylesheet = readFileSync(
  resolve(import.meta.dirname, "footprint-map.css"),
  "utf8"
);

describe("footprint AMap theme", () => {
  it("runs the verification command against the current photo-panel styles", () => {
    const root = resolve(import.meta.dirname, "../..");
    const result = spawnSync(
      process.execPath,
      [resolve(root, "scripts/verify-footprint-theme.mjs")],
      { cwd: root, encoding: "utf8" }
    );
    expect(result.status, result.stderr).toBe(0);
  });

  it("follows the site's data-theme contract for dark mode", () => {
    expect(stylesheet).toContain('html[data-theme="dark"] .footprint-amap');
    expect(stylesheet).not.toContain(".dark .footprint-amap");
  });

  it("keeps vector canvas rendering native and the map background theme-aware", () => {
    expect(stylesheet).toMatch(
      /\.footprint-photo-panel\s*\{[^}]*background: var\(--surface\)/
    );
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
    expect(stylesheet).toContain(".footprint-place-photos img");
  });
});
