import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Astro navigation prefetch", () => {
  it("uses hover prefetching instead of eagerly warming every route", () => {
    const config = readFileSync("astro.config.ts", "utf-8");
    const header = readFileSync("src/components/Header.astro", "utf-8");

    expect(config).toContain('prefetch: { defaultStrategy: "hover" }');
    expect(config).not.toContain("prefetchAll: true");
    expect(header).toContain('data-astro-prefetch="hover"');
  });
});
