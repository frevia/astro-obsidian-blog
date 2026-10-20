import { afterEach, describe, expect, it, vi } from "vitest";
import type { CollectionEntry } from "astro:content";
import postFilter from "./postFilter";
import getSortedPosts from "./getSortedPosts";
import { getCalendarEvents } from "./getCalendarEvents";

const post = (
  id: string,
  published: string,
  eventDate = "2024"
): CollectionEntry<"blog"> => ({
  id,
  collection: "blog",
  filePath: `src/data/blog/${id}.md`,
  data: {
    title: id,
    author: "Frevia",
    description: "",
    tags: [],
    album: false,
    published: new Date(published),
    eventDate,
  },
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});
describe("publication policy stays independent of event dates", () => {
  it("retains the existing 15-minute scheduled publication margin", () => {
    vi.stubEnv("DEV", false);
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-20T12:00:00Z"));
    expect(postFilter(post("later", "2026-10-20T12:16:00Z"))).toBe(false);
    expect(postFilter(post("margin", "2026-10-20T12:14:00Z"))).toBe(true);
  });
  it("sorts new retrospective posts by publication and keeps the calendar on publication day", () => {
    vi.stubEnv("DEV", false);
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-20T12:00:00Z"));
    const recent = post("recent", "2026-10-19T16:30:00Z", "2024");
    const old = post("old", "2025-01-01T00:00:00Z", "2025");
    const future = post("future", "2027-01-01T00:00:00Z", "2023");
    expect(getSortedPosts([old, future, recent]).map(p => p.id)).toEqual([
      "recent",
      "old",
    ]);
    expect(getCalendarEvents([recent, future], [])).toEqual([
      expect.objectContaining({ date: "2026-10-20", title: "recent" }),
    ]);
  });
});
