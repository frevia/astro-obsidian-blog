import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("index hydration boundary", () => {
  it("keeps the editorial home static and hydrates pagination only on Notes", () => {
    const home = readFileSync("src/pages/index.astro", "utf-8");
    const notes = readFileSync("src/pages/notes/index.astro", "utf-8");

    expect(home).not.toContain("<DiaryFeed");
    expect(home).not.toContain("<DiaryLoadMore");
    expect(home).not.toContain("client:");
    expect(notes).toContain("<DiaryFeed");
    expect(notes).toContain("<DiaryLoadMore");
    expect(notes).toContain('client:visible={{ rootMargin: "800px" }}');
    expect(notes).not.toContain("<DiaryTimeline");

    const hydrateDirectives = Array.from(
      notes.matchAll(/client:(?:load|idle|visible|media|only)/g),
      m => m[0]
    );

    expect(hydrateDirectives).toEqual(["client:visible"]);
  });
});
