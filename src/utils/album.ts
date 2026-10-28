import { markdownToHtml } from "satteri";
import { load } from "cheerio";
import { calloutMdastPlugin } from "@/markdown/plugins/callouts";
import { publicationDay } from "./contentDates";
import {
  compareEventPeriods,
  getEventPeriod,
  periodKey,
  type EventPeriod,
} from "./contentDates";

export interface AlbumSource {
  title: string;
  url: string;
  date: string;
  /** Publication instant, kept separately from the article-local display date. */
  published?: string;
  eventDate?: string;
  eventEndDate?: string;
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

export function albumDate(date: Date, timezone?: string) {
  return publicationDay(date, timezone);
}

export interface AlbumPhotoGroup {
  kind: "event" | "published";
  start: string;
  end?: string;
  /** Compatibility field for consumers that previously keyed groups by date. */
  date: string;
  photos: AlbumPhoto[];
}

function preferredSource(photo: AlbumPhoto): AlbumSource | undefined {
  const periods = new Set(
    photo.sources.flatMap(source => {
      const period = getEventPeriod(source);
      return period ? [periodKey(period)] : [];
    })
  );
  if (periods.size > 1)
    console.warn(
      "[album] 来源事件日期不一致，请核对",
      photo.sources.map(source => source.url)
    );
  return [...photo.sources].sort((a, b) => {
    const eventA = getEventPeriod(a);
    const eventB = getEventPeriod(b);
    if (Boolean(eventA) !== Boolean(eventB)) return eventA ? -1 : 1;
    return (
      Date.parse(b.published ?? b.date) - Date.parse(a.published ?? a.date) ||
      b.date.localeCompare(a.date)
    );
  })[0];
}

export function groupAlbumPhotos(photos: AlbumPhoto[]): AlbumPhotoGroup[] {
  const groups = new Map<string, AlbumPhotoGroup>();
  for (const photo of photos) {
    const source = preferredSource(photo);
    if (!source) continue;
    const eventPeriod = getEventPeriod(source);
    const period: EventPeriod = eventPeriod ?? { start: source.date };
    const kind = eventPeriod ? "event" : "published";
    const key = `${kind}:${periodKey(period)}`;
    const group = groups.get(key) ?? {
      kind,
      start: period.start,
      end: period.end,
      date: period.start,
      photos: [],
    };
    group.photos.push(photo);
    groups.set(key, group);
  }
  return Array.from(groups.values()).sort((a, b) =>
    compareEventPeriods(
      { start: b.start, end: b.end },
      { start: a.start, end: a.end }
    )
  );
}
