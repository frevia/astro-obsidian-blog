import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("journal header", () => {
  it("keeps photos in the body while preserving social cover metadata", () => {
    const hero = readFileSync(
      "src/components/article/JournalHero.astro",
      "utf8"
    );
    const layout = readFileSync("src/layouts/PostDetails.astro", "utf8");
    expect(hero).toContain('class="journal-hero-title"');
    expect(hero).toContain('class="journal-hero-description"');
    expect(hero).not.toContain("<img");
    expect(hero).not.toContain("coverTransitionName");
    expect(layout).toContain("cover: socialCover");
    expect(layout).toContain("cover={displayCover}");
  });
});
