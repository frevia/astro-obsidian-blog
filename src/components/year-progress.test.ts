import { readFileSync } from "node:fs";
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
