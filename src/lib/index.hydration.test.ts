import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("index hydration boundary", () => {
  it("hydrates only the diary pagination island on home page", () => {
    const source = readFileSync("src/pages/index.astro", "utf-8");

    expect(source).toContain("<DiaryFeed");
    expect(source).toContain("<DiaryLoadMore");
    expect(source).toContain('client:visible={{ rootMargin: "800px" }}');
    expect(source).not.toContain("<DiaryTimeline");

    const hydrateDirectives = Array.from(
      source.matchAll(/client:(?:load|idle|visible|media|only)/g),
      m => m[0]
    );

    expect(hydrateDirectives).toEqual(["client:visible"]);
  });
});
