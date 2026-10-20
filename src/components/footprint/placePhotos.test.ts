import { describe, expect, it } from "vitest";
import { photosAtPlace } from "./placePhotos";
import type { AlbumPhoto } from "@/utils/album";
const source = (url: string) => ({ url, title: url, date: "2026-01-01" });
const photo: AlbumPhoto = {
  src: "a.webp",
  original: "full.webp",
  width: 10,
  height: 10,
  alt: "桥",
  exif: "",
  sources: [source("/a"), source("/b")],
};
const post = (url: string) => ({
  ...source(url),
  name: "地点",
  lng: 120,
  lat: 30,
  thumbnail: { src: "cover.webp", alt: "封面" },
});
describe("photos at selected place", () => {
  it("restricts both photos and article links to the selected place without mutating the album", () => {
    const result = photosAtPlace([photo], [post("/b")]);
    expect(result).toHaveLength(1);
    expect(result[0].sources.map(item => item.url)).toEqual(["/b"]);
    expect(photo.sources).toHaveLength(2);
    expect(photosAtPlace([photo], [])).toEqual([]);
  });
  it("uses one shared cover as fallback when articles have no opted-in album photos", () => {
    const result = photosAtPlace([photo], [post("/c"), post("/d")]);
    expect(result).toHaveLength(1);
    expect(result[0].src).toBe("cover.webp");
    expect(result[0].sources.map(item => item.url)).toEqual(["/c", "/d"]);
  });
  it("preserves event dates when a thumbnail becomes a fallback photo source", () => {
    const record = {
      ...post("/e"),
      eventDate: "2024-03",
      eventEndDate: "2024-03-14",
    };
    expect(photosAtPlace([], [record])[0].sources[0]).toMatchObject({
      eventDate: "2024-03",
      eventEndDate: "2024-03-14",
    });
  });
});
