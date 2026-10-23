import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

const source = () => readFileSync("src/components/YearProgress.astro", "utf-8");

describe("year progress presentation", () => {
  it("keeps the progress marker accessible and visually quiet", () => {
    const content = source();

    expect(content).toContain('role="progressbar"');
    expect(content).toContain('aria-valuetext="正在计算年度进度"');
    expect(content).toContain('data-active="0"');
    expect(content).toContain("year-progress-bar::after");
    expect(content).toMatch(/\.year-progress\s*\{[^}]*height:\s*2px;/s);
    expect(content).toMatch(
      /@media \(max-width: 639px\)[\s\S]*?\.year-progress\s*\{[^}]*height:\s*1px;/
    );
    expect(content).toContain("prefers-reduced-motion: reduce");
    expect(content).toContain("const INTERVAL_FLAG");
    expect(content).toContain("updateToCurrent(false)");
  });
});

describe("year progress page theme", () => {
  it("updates a persisted bar and clears the previous article color on unthemed pages", () => {
    const content = source();
    const sync = content.slice(
      content.indexOf("function syncYearProgressTheme()"),
      content.indexOf("function initYearProgress()")
    );
    const properties = new Map<string, string>();
    let themed = false;
    let accent: string | null = "#92400e";
    const root = {
      toggleAttribute: (_name: string, enabled: boolean) => {
        themed = enabled;
      },
      style: {
        setProperty: (key: string, value: string) => properties.set(key, value),
        removeProperty: (key: string) => properties.delete(key),
      },
    };
    const context = {
      document: {
        querySelector: (selector: string) => {
          if (selector === ".year-progress") return root;
          expect(selector).toBe("main[data-content-kind]");
          return accent ? {} : null;
        },
      },
      getComputedStyle: () => ({ getPropertyValue: () => accent ?? "" }),
    };
    const syncTheme = () =>
      runInNewContext(`${sync}; syncYearProgressTheme();`, context);
    syncTheme();
    expect(themed).toBe(true);
    expect(properties.get("--year-progress-page-accent")).toBe("#92400e");
    accent = "#0f766e";
    syncTheme();
    expect(properties.get("--year-progress-page-accent")).toBe("#0f766e");
    accent = null;
    syncTheme();
    expect(themed).toBe(false);
    expect(properties.has("--year-progress-page-accent")).toBe(false);
  });
});
