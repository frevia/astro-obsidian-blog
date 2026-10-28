import type { FootprintRecord } from "@/components/FootprintMap";
import {
  compareEventPeriods,
  getEventPeriod,
  publicationDay,
  type RecordPeriod,
} from "./contentDates";

export function groupFootprintStories(records: FootprintRecord[]) {
  const stories = new Map<
    string,
    {
      post: FootprintRecord;
      places: string[];
      period?: RecordPeriod;
    }
  >();
  for (const post of records) {
    const existing = stories.get(post.url);
    if (existing) {
      if (!existing.places.includes(post.name)) existing.places.push(post.name);
      continue;
    }
    const event = getEventPeriod(post);
    const published = post.date ? new Date(post.date) : undefined;
    const period: RecordPeriod | undefined = event
      ? { kind: "event", ...event }
      : published && !Number.isNaN(published.getTime())
        ? { kind: "published", start: publicationDay(published, post.timezone) }
        : undefined;
    stories.set(post.url, { post, places: [post.name], period });
  }
  return [...stories.values()].sort((a, b) => {
    if (!a.period || !b.period)
      return Number(Boolean(b.period)) - Number(Boolean(a.period));
    return (
      compareEventPeriods(b.period, a.period) ||
      a.post.url.localeCompare(b.post.url)
    );
  });
}
