import { describe, expect, it } from "vitest";
import { contentKindStyle, inferPostContentKind } from "./contentPresentation";

describe("content presentation", () => {
  it("prioritizes embedded media over cover imagery", () => {
    expect(
      inferPostContentKind({
        body: "```card-book\ntitle: Example\n```",
        data: { cover: "/cover.jpg", tags: ["随笔"] },
      })
    ).toBe("media");
  });

  it("classifies authored covers and plain posts deterministically", () => {
    expect(
      inferPostContentKind({
        body: "plain text",
        data: { cover: "/cover.jpg", tags: ["生活"] },
      })
    ).toBe("image");
    expect(
      inferPostContentKind({
        body: "plain text",
        data: { tags: ["生活"] },
      })
    ).toBe("text");
  });

  it("exports stable CSS variable hooks for every content kind", () => {
    for (const kind of ["text", "media", "image", "featured"] as const) {
      const style = contentKindStyle(kind);
      expect(style).toContain("--content-accent:");
      expect(style).toContain("--content-accent-soft:");
      expect(style).toContain("--content-image-opacity:");
    }
  });
});
