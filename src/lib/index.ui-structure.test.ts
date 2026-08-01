import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("home page UI structure", () => {
  it("does not include quick entry section", () => {
    const source = readFileSync("src/pages/index.astro", "utf-8");

    expect(source).not.toContain('id="home-entry-points"');
    expect(source).not.toContain('aria-labelledby="home-entry-heading"');
    expect(source).not.toContain('<h2 id="home-entry-heading"');
    expect(source).not.toContain("快速入口");
  });
});

describe("typography readability baseline", () => {
  it("avoids excessive text-xs in core content blocks", () => {
    const feeds = readFileSync("src/pages/feeds/index.astro", "utf-8");
    const archives = readFileSync("src/pages/archives/index.astro", "utf-8");

    expect(feeds).not.toContain("text-xs");
    expect(archives).not.toContain("text-xs");
  });
});

describe("empty-state visual consistency", () => {
  it("uses consistent empty-state container class", () => {
    const feeds = readFileSync("src/pages/feeds/index.astro", "utf-8");
    const favorites = readFileSync("src/pages/favorites/index.astro", "utf-8");
    const diary = readFileSync("src/pages/diary/[...page].astro", "utf-8");
    const diaryLoadState = readFileSync(
      "src/components/diary/DiaryLoadState.tsx",
      "utf-8"
    );
    const globalCss = readFileSync("src/styles/global.css", "utf-8");

    expect(feeds).toContain("empty-state-card");
    expect(favorites).toContain("empty-state-card");
    expect(diary).toContain("empty-state-card");
    expect(diaryLoadState).toContain("empty-state-card");
    expect(globalCss).toContain(".empty-state-card");
  });
});
