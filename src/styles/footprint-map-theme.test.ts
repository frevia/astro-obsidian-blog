import { describe, expect, it } from "vitest";
import {
  FOOTPRINT_MAP_THEME,
  FOOTPRINT_THEME_CLASS_VALUES,
} from "./footprint-map-theme";

describe("FOOTPRINT_MAP_THEME", () => {
  it("uses orange for visited city highlights", () => {
    expect(FOOTPRINT_MAP_THEME.visitedNationalFill).toContain("#ff5a36");
    expect(FOOTPRINT_MAP_THEME.visitedProvinceFill).toContain("#ff5a36");
  });

  it("keeps markers on site accent", () => {
    expect(FOOTPRINT_MAP_THEME.markerFill).toContain("accent");
  });

  it("keeps label text readable (foreground opacity)", () => {
    expect(FOOTPRINT_MAP_THEME.labelFill).toMatch(/foreground\/7\d/);
  });

  it("exports a class string for every theme key", () => {
    expect(FOOTPRINT_THEME_CLASS_VALUES.length).toBe(
      Object.keys(FOOTPRINT_MAP_THEME).length
    );
    for (const value of FOOTPRINT_THEME_CLASS_VALUES) {
      expect(value.length).toBeGreaterThan(0);
    }
  });
});
