import { describe, expect, it } from "vitest";
import { buildFragmentPreviews } from "./fragmentPreviews";

describe("buildFragmentPreviews", () => {
  it("selects content-aware previews in source order", () => {
    const previews = buildFragmentPreviews(
      [
        {
          date: "2026-04-25",
          timeBlocks: [
            { time: "23:59", text: "divider" },
            {
              time: "21:30",
              text: "<p>有图片的 Notes</p>",
              images: [{ src: "/photo.webp", alt: "湖边" }],
            },
            {
              time: "20:10",
              bookData: { title: "一本书", poster: "/book.webp" },
            },
            { time: "19:00", text: "<strong>纯文字</strong> 记录" },
          ],
        },
      ],
      3
    );

    expect(previews.map(item => item.kind)).toEqual(["image", "media", "text"]);
    expect(previews[0].href).toBe("/notes#diary-2026-04-25-21-30");
    expect(previews[0].excerpt).toBe("有图片的 Notes");
    expect(previews[1].mediaLabel).toBe("阅读");
  });
});
