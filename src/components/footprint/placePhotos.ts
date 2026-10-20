import type { AlbumPhoto } from "@/utils/album";
import type { FootprintRecord } from "../FootprintMap";

export function photosAtPlace(
  photos: AlbumPhoto[],
  posts: FootprintRecord[]
): AlbumPhoto[] {
  const urls = new Set(posts.map(post => post.url));
  const selected = photos.flatMap(photo => {
    const sources = photo.sources.filter(source => urls.has(source.url));
    return sources.length ? [{ ...photo, sources }] : [];
  });
  for (const post of posts) {
    if (
      !post.thumbnail ||
      selected.some(photo =>
        photo.sources.some(source => source.url === post.url)
      )
    )
      continue;
    const existing = selected.find(photo => photo.src === post.thumbnail!.src);
    const source = {
      title: post.title,
      url: post.url,
      date: post.date || "",
      published: post.date,
      eventDate: post.eventDate,
      eventEndDate: post.eventEndDate,
    };
    if (existing) existing.sources.push(source);
    else
      selected.push({
        src: post.thumbnail.src,
        original: post.thumbnail.src,
        width: 0,
        height: 0,
        alt: post.thumbnail.alt,
        exif: "",
        sources: [source],
      });
  }
  return selected;
}
