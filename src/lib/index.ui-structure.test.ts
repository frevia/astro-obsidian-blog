import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("home page UI structure", () => {
  it("does not include quick entry section", () => {
    const source = readFileSync("src/pages/index.astro", "utf-8");

    expect(source).not.toContain("id=\"home-entry-points\"");
    expect(source).not.toContain("aria-labelledby=\"home-entry-heading\"");
    expect(source).not.toContain("<h2 id=\"home-entry-heading\"");
    expect(source).not.toContain("快速入口");
  });
});
