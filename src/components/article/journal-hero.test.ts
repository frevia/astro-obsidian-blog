import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("journal header", () => {
  it("reuses the ordinary article header without duplicating its cover", () => {
    const hero = readFileSync(
      "src/components/article/JournalHero.astro",
      "utf8"
    );
    const layout = readFileSync("src/layouts/PostDetails.astro", "utf8");
    expect(hero).toContain("<ArticleHero");
    expect(hero).toContain("{...Astro.props}");
    expect(hero).toContain("showMedia={false}");
    expect(hero).toContain('<slot name="places" slot="places"');
    const journalProps = layout.split("<JournalHero")[1].split(">")[0];
    for (const prop of [
      "{eventDate}",
      "{eventEndDate}",
      "{published}",
      "{readingMinutes}",
    ]) {
      expect(journalProps).toContain(prop);
    }
    expect(layout).toContain("cover: socialCover");
    expect(layout).toContain("cover={displayCover}");
  });
});
