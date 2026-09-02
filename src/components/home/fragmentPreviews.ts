import type {
  DiaryImage,
  ParsedEntry,
  TimeBlock,
} from "@/components/diary/types";
import {
  contentKindStyle,
  type ContentKind,
} from "@/components/post-list/contentPresentation";
import { withBase } from "@/utils/withBase";

export interface HomeFragmentPreview {
  date: string;
  time: string;
  href: string;
  kind: Exclude<ContentKind, "featured">;
  excerpt: string;
  image?: { src: string; alt: string };
  mediaLabel?: string;
  style: string;
}

// Keep this presentation helper tolerant of the small image fixtures used by
// older callers. Collection parsing still produces the complete DiaryImage
// shape consumed by the Astro feed and gallery.
type PreviewImage = Pick<DiaryImage, "alt" | "src"> &
  Partial<Omit<DiaryImage, "alt" | "src">>;
type PreviewTimeBlock = Omit<TimeBlock, "images"> & {
  images?: PreviewImage[];
};
type PreviewEntry = Omit<ParsedEntry, "timeBlocks"> & {
  timeBlocks: PreviewTimeBlock[];
};

const stripHtml = (value: string): string =>
  value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();

const truncate = (value: string, length = 92): string =>
  value.length > length ? `${value.slice(0, length).trimEnd()}…` : value;

function mediaFromBlock(block: PreviewTimeBlock): {
  label?: string;
  poster?: string;
  title?: string;
} {
  if (block.movieData)
    return {
      label: "电影",
      poster: block.movieData.poster,
      title: block.movieData.title,
    };
  if (block.tvData)
    return {
      label: "剧集",
      poster: block.tvData.poster,
      title: block.tvData.title,
    };
  if (block.bookData)
    return {
      label: "阅读",
      poster: block.bookData.poster,
      title: block.bookData.title,
    };
  if (block.musicData)
    return {
      label: "音乐",
      poster: block.musicData.poster,
      title: block.musicData.title,
    };
  if (block.htmlContent) return { label: "内容" };
  return {};
}

export function buildFragmentPreviews(
  entries: PreviewEntry[],
  limit = 3
): HomeFragmentPreview[] {
  const previews: HomeFragmentPreview[] = [];

  for (const entry of entries) {
    for (const block of entry.timeBlocks) {
      if (block.time === "00:00" || block.time === "23:59") continue;

      const firstImage = block.images?.[0];
      const media = mediaFromBlock(block);
      const kind = firstImage ? "image" : media.label ? "media" : "text";
      const plainText = stripHtml(
        [block.text, block.postText].filter(Boolean).join(" ")
      );
      const excerpt = truncate(
        plainText || media.title || firstImage?.alt || "查看这条 Notes 记录"
      );

      previews.push({
        date: entry.date,
        time: block.time,
        href: withBase(
          `/notes#diary-${entry.date}-${block.time.replace(/:/g, "-")}`
        ),
        kind,
        excerpt,
        image: firstImage
          ? { src: firstImage.src, alt: firstImage.alt || "Notes 配图" }
          : media.poster
            ? { src: media.poster, alt: media.title || "媒体封面" }
            : undefined,
        mediaLabel: media.label,
        style: contentKindStyle(kind),
      });

      if (previews.length >= limit) return previews;
    }
  }

  return previews;
}
