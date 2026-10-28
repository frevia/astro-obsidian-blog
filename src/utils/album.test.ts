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
  it("keeps metadata photo callouts in source order", async () => {
    const images = await extractAlbumImages(
      [
        "> [!photos|EQUAL] Equal pair",
        "> ![桥](./bridge.jpg) ![河](./river.jpg)",
        "",
        "> [!photos|wide] Full frame",
        "> ![山谷](./valley.jpg)",
      ].join("\n")
    );

    expect(images).toEqual([
      { src: "./bridge.jpg", alt: "桥" },
      { src: "./river.jpg", alt: "河" },
      { src: "./valley.jpg", alt: "山谷" },
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
  it("groups by the preferred explicit event period and separates publication fallback", () => {
    const photo = (
      url: string,
      date: string,
      eventDate?: string,
      eventEndDate?: string
    ): AlbumPhoto => ({
      src: `${url}.jpg`,
      original: `${url}.jpg`,
      width: 1,
      height: 1,
      alt: "",
      exif: "",
      sources: [{ title: url, url, date, eventDate, eventEndDate }],
    });
    const groups = groupAlbumPhotos([
      photo("published", "2026-06-01"),
      photo("event", "2026-06-02", "2024-03"),
      photo("event-range", "2026-06-03", "2024-03", "2024-04"),
    ]);
    expect(
      groups.map(group => [
        group.kind,
        group.start,
        group.end,
        group.photos.length,
      ])
    ).toEqual(
      expect.arrayContaining([
        ["published", "2026-06-01", undefined, 1],
        ["event", "2024-03", "2024-04", 1],
        ["event", "2024-03", undefined, 1],
      ])
    );
    expect(groups[0].kind).toBe("published");
  });
  it("uses an explicit event source before newer publication sources for shared photos", () => {
    const photo: AlbumPhoto = {
      src: "shared.jpg",
      original: "shared.jpg",
      width: 1,
      height: 1,
      alt: "",
      exif: "",
      sources: [
        { title: "newer publish", url: "/new", date: "2026-05-01" },
        {
          title: "event",
          url: "/event",
          date: "2024-01-01",
          eventDate: "2024-03",
        },
      ],
    };
    expect(groupAlbumPhotos([photo])[0]).toMatchObject({
      kind: "event",
      start: "2024-03",
      photos: [photo],
    });
  });
  it("chooses the latest publication instant even when article-local dates order differently", () => {
    const photo: AlbumPhoto = {
      src: "shared.jpg",
      original: "shared.jpg",
      width: 1,
      height: 1,
      alt: "",
      exif: "",
      sources: [
        {
          title: "older Shanghai post",
          url: "/older",
          date: "2026-04-01",
          published: "2026-03-31T18:00:00Z",
          eventDate: "2024",
        },
        {
          title: "newer Los Angeles post",
          url: "/newer",
          date: "2026-03-31",
          published: "2026-04-01T01:00:00Z",
          eventDate: "2025",
        },
      ],
    };
    expect(groupAlbumPhotos([photo])[0].start).toBe("2025");
  });
});
