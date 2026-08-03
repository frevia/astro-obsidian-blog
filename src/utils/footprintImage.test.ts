import { describe, expect, it } from "vitest";
import { firstContentImage } from "./footprintImage";

describe("footprint article thumbnails", () => {
  it("extracts the first Markdown image from article content", () => {
    expect(
      firstContentImage(
        `正文\n\n![](../../attachments/first.jpg)\n![](second.jpg)`
      )
    ).toBe("../../attachments/first.jpg");
  });

  it("supports Obsidian image embeds and empty articles", () => {
    expect(firstContentImage("正文\n![[travel/photo.webp|风景]]")).toBe(
      "travel/photo.webp"
    );
    expect(firstContentImage()).toBeUndefined();
  });
});
