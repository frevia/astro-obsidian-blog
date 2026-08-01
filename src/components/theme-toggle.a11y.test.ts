import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Theme toggle accessibility naming and state", () => {
  const headerPath = resolve(import.meta.dirname, "Header.astro");
  const controlsPath = resolve(
    import.meta.dirname,
    "../../public/app-controls.js"
  );

  it("uses action-oriented Chinese aria label and pressed state in header", () => {
    const header = readFileSync(headerPath, "utf-8");

    expect(header).toContain("themeLight: t.a11y.themeLight");
    expect(header).toContain("themeDark: t.a11y.themeDark");
    expect(header).toContain("themeAuto: t.a11y.themeAuto");
    expect(header).toContain("aria-label={headerLabels.themeAuto}");
    expect(header).toContain(
      "data-theme-light-label={headerLabels.themeLight}"
    );
    expect(header).toContain("data-theme-dark-label={headerLabels.themeDark}");
    expect(header).toContain("data-theme-auto-label={headerLabels.themeAuto}");
    expect(header).toContain('aria-pressed="false"');
  });

  it("reflects theme state to aria-label and aria-pressed in controls script", () => {
    const script = readFileSync(controlsPath, "utf-8");

    expect(script).toContain("getThemeA11yLabel(themeValue, themeBtn)");
    expect(script).toContain("control.dataset.themeLightLabel");
    expect(script).toContain("control.dataset.themeDarkLabel");
    expect(script).toContain("control.dataset.themeAutoLabel");
    expect(script).toContain(
      'setAttribute("aria-pressed", getThemePressed(themeValue))'
    );
    expect(script).not.toContain('setAttribute("aria-label", themeValue)');
  });

  it("does not keep fallback theme labels in the controls script", () => {
    const script = readFileSync(controlsPath, "utf-8");

    expect(script).not.toContain("当前：浅色");
    expect(script).not.toContain("当前：深色");
    expect(script).not.toContain("当前：自动");
    expect(script).not.toContain("current: light");
    expect(script).not.toContain("current: dark");
    expect(script).not.toContain("current: auto");
    expect(script).not.toContain("夜间模式");
  });

  it("binds the global controls lifecycle only once", () => {
    const script = readFileSync(controlsPath, "utf-8");

    expect(script).toContain("if (window.__appControlsInitialized) return;");
    expect(script).toContain("window.__appControlsInitialized = true;");
    expect(script.match(/astro:after-swap/g)).toHaveLength(1);
  });

  it("keeps desktop and mobile theme toggles consistent", () => {
    const header = readFileSync(headerPath, "utf-8");

    expect(header).toContain('id="theme-btn"');
    expect(header).toContain('id="theme-btn-mobile"');
    expect(header).toContain("aria-label={headerLabels.themeAuto}");
    expect(header).toContain('aria-pressed="false"');
  });
});
