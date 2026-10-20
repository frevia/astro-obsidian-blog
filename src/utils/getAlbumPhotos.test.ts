import { describe, expect, it, vi } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { CollectionEntry } from "astro:content";

vi.mock("node:fs/promises", () => ({
  realpath: vi.fn(async (value: string | URL) => {
    const resolved =
      value instanceof URL ? fileURLToPath(value) : path.resolve(value);
    if (resolved.endsWith("missing.jpg")) throw new Error("missing");
    return resolved;
  }),
}));
vi.mock("./optimizeImages", () => ({
  optimizeImage: vi.fn(async (src: string) => ({
    thumbnail: src.endsWith("broken.jpg") ? src : "/thumb.webp",
    original: "/full.webp",
    width: 1200,
    height: 800,
  })),
}));
vi.mock("@/markdown/plugins/photoExif", () => ({
  readPhotoExif: vi.fn(async () => "型号: Camera"),
}));
vi.mock("./postFilter", () => ({
  default: (post: CollectionEntry<"blog">) =>
    post.data.published.getTime() < Date.now(),
}));

import { getAlbumPhotos, getPostPhotos } from "./getAlbumPhotos";

const post = (
  id: string,
  date: string,
  body: string,
  album = true,
  pageLayout: "journal" | null = "journal",
  eventDate?: string,
  eventEndDate?: string
): CollectionEntry<"blog"> => ({
  id,
  collection: "blog",
  filePath: `src/data/blog/旅行/${id}.md`,
  body,
  data: {
    title: id,
    author: "Frevia",
    published: new Date(date),
    eventDate,
    eventEndDate,
    description: "",
    tags: [],
    pageLayout: pageLayout ?? undefined,
    album,
  },
});

describe("album source resolution", () => {
  it("deduplicates attachments while keeping all source links and newest date", async () => {
    const photos = await getAlbumPhotos([
      post(
        "old",
        "2024-01-01",
        "> [!photos]\n> ![旧图](../../attachments/a.jpg)"
      ),
      post(
        "new",
        "2025-01-01",
        "> [!photos]\n> ![新图](../../attachments/a.jpg) ![重复](../../attachments/a.jpg)"
      ),
      post(
        "off",
        "2025-02-01",
        "> [!photos]\n> ![未收录](../../attachments/b.jpg)",
        false
      ),
      post(
        "future",
        "2999-01-01",
        "> [!photos]\n> ![未发布](../../attachments/c.jpg)"
      ),
    ]);
    expect(photos).toHaveLength(1);
    expect(photos[0].alt).toBe("新图");
    expect(photos[0].sources.map(source => source.url)).toEqual([
      "/posts/new",
      "/posts/old",
    ]);
    expect(photos[0].original).toBe("/full.webp");
  });
  it("carries event dates through photo sources while preserving publication date", async () => {
    const photos = await getAlbumPhotos([
      post(
        "event",
        "2025-01-01",
        "> [!photos]\n> ![相片](../../attachments/event.jpg)",
        true,
        "journal",
        "2024-03",
        "2024-03-14"
      ),
    ]);
    expect(photos[0].sources[0]).toMatchObject({
      date: "2025-01-01",
      eventDate: "2024-03",
      eventEndDate: "2024-03-14",
    });
  });
  it("skips missing, external, out-of-bound and failed images without exposing paths", async () => {
    const photos = await getAlbumPhotos([
      post(
        "a",
        "2025-01-01",
        [
          "> [!photos]",
          "> ![外链](https://example.com/a.jpg)",
          "> ![私有](../../../../private.jpg)",
          "> ![缺失](../../attachments/missing.jpg)",
          "> ![失败](../../attachments/broken.jpg)",
        ].join("\n")
      ),
    ]);
    expect(photos).toEqual([]);
  });

  it("extracts photos from non-album and non-journal posts only through photos callouts", async () => {
    const posts = [
      post(
        "album-off",
        "2025-01-01",
        "> [!photos]\n> ![未收录相册](../../attachments/off.jpg)",
        false
      ),
      post(
        "ordinary-layout",
        "2025-02-01",
        [
          "![普通正文图片](../../attachments/body.jpg)",
          "",
          "> [!photos]",
          "> ![普通布局照片](../../attachments/callout.jpg)",
        ].join("\n"),
        true,
        null
      ),
    ];

    expect(await getAlbumPhotos(posts)).toEqual([]);
    const photos = await getPostPhotos(posts);
    expect(photos).toHaveLength(2);
    expect(photos.map(photo => photo.alt)).toEqual([
      "普通布局照片",
      "未收录相册",
    ]);
  });

  it("continues to filter future posts for general post photos", async () => {
    const photos = await getPostPhotos([
      post(
        "future",
        "2999-01-01",
        "> [!photos]\n> ![未发布](../../attachments/future.jpg)"
      ),
    ]);

    expect(photos).toEqual([]);
  });
});
