import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("MediaCard render contract", () => {
  it("renders article media cards without a standalone client island", () => {
    const source = readFileSync(
      resolve(import.meta.dirname, "MediaCard.astro"),
      "utf-8"
    );

    expect(source).not.toContain(
      'import MediaCardComponent from "./MediaCard.tsx"'
    );
    expect(source).not.toMatch(/client:(?:load|idle|visible|media|only)/);
    expect(source).toContain("data-media-type={cardType}");
    expect(source).toContain("href={cardUrl}");
  });

  it("keeps image optimization and media-specific links in static markup", () => {
    const source = readFileSync(
      resolve(import.meta.dirname, "MediaCard.astro"),
      "utf-8"
    );

    expect(source).toContain("await optimizeImage(mediaData.poster)");
    expect(source).toContain("https://www.themoviedb.org/tv/");
    expect(source).toContain("https://book.douban.com/subject/");
    expect(source).toContain("https://www.themoviedb.org/movie/");
  });

  it("builds unique half-star clipPath ids per card", () => {
    const source = readFileSync(
      resolve(import.meta.dirname, "MediaCard.astro"),
      "utf-8"
    );

    expect(source).toContain("half-star-${id ?? title}-${star}");
    expect(source).toContain("clip-path={`url(#${starClipId})`}");
  });
});
