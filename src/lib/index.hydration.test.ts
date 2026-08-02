import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("index hydration boundary", () => {
  it("hydrates only DiaryTimeline on home page", () => {
    const source = readFileSync("src/pages/index.astro", "utf-8");

    expect(source).toContain("<DiaryTimeline");
    expect(source).toContain("client:idle");

    const hydrateDirectives = Array.from(
      source.matchAll(/client:(?:load|idle|visible|media|only)/g),
      m => m[0]
    );

    expect(hydrateDirectives).toEqual(["client:idle"]);
  });
});
