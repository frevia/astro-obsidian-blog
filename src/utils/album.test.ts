import { describe, expect, it } from "vitest";
import {
  extractAlbumImages,
  isAlbumPost,
  albumDate,
  groupAlbumPhotos,
  type AlbumPhoto,
} from "./album";

describe("album collection", () => {
  it("requires explicit opt-in and Journal layout", () => {
    expect(isAlbumPost({ pageLayout: "journal", album: true })).toBe(true);
    expect(isAlbumPost({ pageLayout: "journal" })).toBe(false);
    expect(isAlbumPost({ album: true })).toBe(false);
  });
  it("collects only top-level photo callouts, including folded and reference images", async () => {
    const images = await extractAlbumImages(
      [
        "![普通插图](./ordinary.jpg)",
        "",
        "> [!photos]- 河边",
        "> ![桥](<./bridge photo.jpg>) ![河][river]",
        "",
        "[river]: ./river.jpg",
        "",
        "> [!note]",
        "> ![说明](./note.jpg)",
        "",
        "```md",
        "> [!photos]",
        "> ![示例](./example.jpg)",
        "```",
        "",
        "> [!note] 外层",
        ">",
        "> > [!photos]",
        "> > ![嵌套](./nested.jpg)",
      ].join("\n")
    );
    expect(images).toEqual([
      { src: "./bridge%20photo.jpg", alt: "桥" },
      { src: "./river.jpg", alt: "河" },
    ]);
  });
  it("uses site-local publication dates, not host timezone", () => {
    expect(albumDate(new Date("2026-03-31T18:00:00Z"))).toBe("2026-04-01");
  });
  it("groups by exact publication day, newest first", () => {
    const photo = (date: string): AlbumPhoto => ({
      src: "a.jpg",
      original: "a.jpg",
      width: 1,
      height: 1,
      alt: "",
      exif: "",
      sources: [{ title: "旅行", url: "/posts/a", date }],
    });
    expect(
      groupAlbumPhotos([
        photo("2024-03-06"),
        photo("2026-04-01"),
        photo("2026-04-02"),
        photo("2026-04-01"),
      ]).map(group => [group.date, group.photos.length])
    ).toEqual([
      ["2026-04-02", 1],
      ["2026-04-01", 2],
      ["2024-03-06", 1],
    ]);
  });
});
