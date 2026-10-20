import path from "node:path";
import { realpath } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import type { CollectionEntry } from "astro:content";
import {
  extractAlbumImages,
  isAlbumPost,
  albumDate,
  type AlbumPhoto,
} from "./album";
import { optimizeImage } from "./optimizeImages";
import { readPhotoExif } from "@/markdown/plugins/photoExif";
import { getImageCaption } from "./imageCaption";
import { getPath } from "./getPath";
import postFilter from "./postFilter";

export async function getAlbumPhotos(
  posts: CollectionEntry<"blog">[]
): Promise<AlbumPhoto[]> {
  return getPostPhotos(posts.filter(post => isAlbumPost(post.data)));
}

export async function getPostPhotos(
  posts: CollectionEntry<"blog">[]
): Promise<AlbumPhoto[]> {
  const photos = new Map<string, AlbumPhoto>();
  const roots = await Promise.all(
    ["src/data/attachments", "src/data/attachment"].map(root =>
      realpath(root).catch(() => "")
    )
  );
  for (const post of posts
    .filter(postFilter)
    .sort((a, b) => b.data.published.getTime() - a.data.published.getTime())) {
    if (!post.filePath) continue;
    const fileURL = pathToFileURL(path.resolve(post.filePath));
    const source = {
      title: post.data.title,
      url: getPath(post.id, post.filePath),
      date: albumDate(post.data.published, post.data.timezone),
      published: post.data.published.toISOString(),
      eventDate: post.data.eventDate,
      eventEndDate: post.data.eventEndDate,
    };
    for (const image of await extractAlbumImages(post.body ?? "")) {
      // Only exported local attachments participate; never scan private or remote files.
      if (/^(?:[a-z][a-z\d+.-]*:|\/)/i.test(image.src)) continue;
      let resolved: string;
      try {
        resolved = await realpath(new URL(image.src, fileURL));
      } catch {
        continue;
      }
      if (
        !roots.some(root => root && resolved.startsWith(root + path.sep)) ||
        !/\.(?:jpe?g|png|webp|gif)$/i.test(resolved)
      )
        continue;
      const existing = photos.get(resolved);
      if (existing) {
        if (!existing.sources.some(item => item.url === source.url))
          existing.sources.push(source);
        continue;
      }
      const optimized = await optimizeImage(resolved, {
        thumbnailSize: 720,
        quality: 82,
        needFullSize: true,
      });
      // A failed optimizer returns its input path, which must not become a public URL.
      if (optimized.thumbnail === resolved) continue;
      photos.set(resolved, {
        src: optimized.thumbnail,
        original: optimized.original || optimized.thumbnail,
        width: optimized.width,
        height: optimized.height,
        alt: getImageCaption(image.alt, image.src),
        exif: await readPhotoExif(image.src, fileURL),
        sources: [source],
      });
    }
  }
  return [...photos.values()];
}
