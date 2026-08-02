import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Astro 7 content collection loading", () => {
  it("defers markdown rendering for all local collections", () => {
    const source = readFileSync("src/content.config.ts", "utf-8");
    const loaders = source.match(/loader: glob\([\s\S]*?\n  \}\),/g) ?? [];

    expect(loaders).toHaveLength(3);
    loaders.forEach(loader => expect(loader).toContain("deferRender: true"));
  });
});
