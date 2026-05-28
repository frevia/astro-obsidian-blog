import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Theme toggle accessibility naming and state", () => {
  const headerPath = resolve(import.meta.dirname, "Header.astro");
  const controlsPath = resolve(import.meta.dirname, "../../public/app-controls.js");

  it("uses action-oriented Chinese aria label and pressed state in header", () => {
    const header = readFileSync(headerPath, "utf-8");

    expect(header).toContain('aria-label="切换主题（当前：自动）"');
    expect(header).toContain('aria-pressed="false"');
  });

  it("reflects theme state to aria-label and aria-pressed in controls script", () => {
    const script = readFileSync(controlsPath, "utf-8");

    expect(script).toContain('setAttribute("aria-label", getThemeA11yLabel(themeValue))');
    expect(script).toContain('setAttribute("aria-pressed", getThemePressed(themeValue))');
    expect(script).not.toContain('setAttribute("aria-label", themeValue)');
  });

  it("uses consistent wording for theme states", () => {
    const script = readFileSync(controlsPath, "utf-8");

    expect(script).toContain("当前：浅色");
    expect(script).toContain("当前：深色");
    expect(script).toContain("当前：自动");
    expect(script).not.toContain("夜间模式");
  });

  it("keeps desktop and mobile theme toggles consistent", () => {
    const header = readFileSync(headerPath, "utf-8");

    expect(header).toContain('id="theme-btn"');
    expect(header).toContain('id="theme-btn-mobile"');
    expect(header).toContain('aria-label="切换主题（当前：自动）"');
    expect(header).toContain('aria-pressed="false"');
  });
});
