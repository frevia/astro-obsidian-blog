import { markdownToHtml } from "satteri";
import { load } from "cheerio";
import { calloutMdastPlugin } from "@/markdown/plugins/callouts";
import { toSiteYMD } from "./calendarDate";

export interface AlbumSource {
  title: string;
  url: string;
  date: string;
}

export interface AlbumPhoto {
  src: string;
  original: string;
  width: number;
  height: number;
  alt: string;
  exif: string;
  sources: AlbumSource[];
}

export function isAlbumPost(data: { album?: boolean; pageLayout?: string }) {
  return data.album === true && data.pageLayout === "journal";
}

// Parse Markdown rather than matching image syntax inside fences or nested quotes.
export async function extractAlbumImages(body: string) {
  const { html } = await markdownToHtml(body, {
    features: { gfm: true, frontmatter: true, wikilinks: true },
    mdastPlugins: [calloutMdastPlugin],
  });
  const $ = load(html);
  return $("body > blockquote[data-callout='photos'] img")
    .toArray()
    .filter(image => $(image).parents("blockquote").length === 1)
    .map(image => ({
      src: $(image).attr("src") || "",
      alt: $(image).attr("alt") || "",
    }))
    .filter(image => Boolean(image.src));
}

export function albumDate(date: Date) {
  return toSiteYMD(date);
}

export function groupAlbumPhotos(photos: AlbumPhoto[]) {
  const groups = new Map<string, AlbumPhoto[]>();
  for (const photo of [...photos].sort((a, b) =>
    b.sources[0].date.localeCompare(a.sources[0].date)
  )) {
    const month = photo.sources[0].date.slice(0, 7);
    const group = groups.get(month) ?? [];
    group.push(photo);
    groups.set(month, group);
  }
  return Array.from(groups, ([month, photos]) => ({ month, photos }));
}
