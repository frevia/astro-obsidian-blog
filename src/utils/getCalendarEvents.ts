import type { CollectionEntry } from "astro:content";
import { getPath } from "@/utils/getPath";
import postFilter from "@/utils/postFilter";
import { toYMDInTimeZone } from "@/utils/calendarDate";

export type CalendarEventType = "blog" | "diary";

export interface CalendarEvent {
  type: CalendarEventType;
  url: string;
  title?: string;
  date: string; // YYYY-MM-DD
}

/** 从 YYYY-MM-DD 得到季度 key，如 2025-Q4 */
function getQuarterKey(dateStr: string): string {
  const [year, month] = dateStr.split("-");
  const quarter = Math.ceil(parseInt(month, 10) / 3);
  return `${year}-Q${quarter}`;
}

/**
 * 聚合 blog（published）和 diary（文件名日期）为日历事件列表。
 * 用于日历组件：某日有事件则标记，点击跳转到对应文章或日记。
 */
export function getCalendarEvents(
  blogEntries: CollectionEntry<"blog">[],
  diaryEntries: CollectionEntry<"diary">[]
): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  const publishedPosts = blogEntries.filter(postFilter);
  for (const post of publishedPosts) {
    const d = post.data.published;
    const dateStr = toYMDInTimeZone(d);
    events.push({
      type: "blog",
      date: dateStr,
      url: getPath(post.id, post.filePath),
      title: post.data.title,
    });
  }

  for (const entry of diaryEntries) {
    const dateStr = entry.id.split("/").pop()!.replace(".md", "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) continue;
    const quarterKey = getQuarterKey(dateStr);
    events.push({
      type: "diary",
      date: dateStr,
      url: `/diary/${quarterKey}#date-${dateStr}`,
      title: undefined,
    });
  }

  return events;
}

/** 按日期分组的 Map：YYYY-MM-DD -> CalendarEvent[] */
export function getCalendarEventsByDate(
  blogEntries: CollectionEntry<"blog">[],
  diaryEntries: CollectionEntry<"diary">[]
): Map<string, CalendarEvent[]> {
  const events = getCalendarEvents(blogEntries, diaryEntries);
  const byDate = new Map<string, CalendarEvent[]>();
  for (const ev of events) {
    const list = byDate.get(ev.date) ?? [];
    list.push(ev);
    byDate.set(ev.date, list);
  }
  return byDate;
}
