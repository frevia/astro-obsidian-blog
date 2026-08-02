import type { CollectionEntry } from "astro:content";

export type ContentKind = "text" | "media" | "image" | "featured";

type ContentAwarePost = {
  body?: string;
  data: Pick<CollectionEntry<"blog">["data"], "cover" | "tags">;
};

const MEDIA_TAG = /(?:电影|电视|剧集|音乐|阅读|书籍|movie|music|book|tv)/i;
const MEDIA_BLOCK = /```card-(?:movie|tv|book|music)\b/;
const MARKDOWN_IMAGE = /!\[[^\]]*\]\([^\)]+\)|!\[\[[^\]]+\]\]/;

export function inferPostContentKind(
  post: ContentAwarePost
): Exclude<ContentKind, "featured"> {
  if (
    MEDIA_BLOCK.test(post.body ?? "") ||
    post.data.tags.some(tag => MEDIA_TAG.test(tag))
  ) {
    return "media";
  }

  if (post.data.cover || MARKDOWN_IMAGE.test(post.body ?? "")) return "image";
  return "text";
}

const IMAGE_OPACITY: Record<ContentKind, number> = {
  text: 0.05,
  media: 0.12,
  image: 0.16,
  featured: 0.2,
};

/** Stable element-level hook for future content-derived accent extraction. */
export function contentKindStyle(kind: ContentKind): string {
  return [
    "--content-accent: var(--page-accent, var(--accent))",
    "--content-accent-soft: var(--page-accent-soft, color-mix(in srgb, var(--accent) 14%, transparent))",
    `--content-image-opacity: ${IMAGE_OPACITY[kind]}`,
  ].join("; ");
}
