import { describe, expect, it } from "vitest";
import { getArticleAccent, getArticleAccentStyle } from "./pageAccent";

describe("article page accent", () => {
  it("maps supported card types to stable page colors", () => {
    expect(getArticleAccent({ cardType: "book" })).toEqual({
      key: "book",
      accent: "#92400e",
      soft: "#fffbeb",
    });
    expect(getArticleAccent({ cardType: "music" })).toEqual({
      key: "music",
      accent: "#0f766e",
      soft: "#f0fdfa",
    });
  });

  it("falls back from embedded card type to article category", () => {
    expect(
      getArticleAccent({ body: "No cards here", tags: ["技术", "安全"] })
    ).toMatchObject({ key: "technical" });
    expect(
      getArticleAccent({ body: "```card-movie\n...", tags: ["技术"] })
    ).toMatchObject({ key: "movie" });
  });

  it("returns a safe inline style string for CSS custom properties", () => {
    const style = getArticleAccentStyle({ cardType: "unknown; color: red" });

    expect(style).toBe("--page-accent:#3d6b7f;--page-accent-soft:#e8f1f5;");
    expect(style).not.toContain("color: red");
  });
});
