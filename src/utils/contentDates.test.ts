import { describe, expect, it, vi } from "vitest";
import {
  normalizeEventFields,
  formatEventPeriod,
  getRecordPeriod,
  compareEventPeriods,
  parsePublishedDate,
  publicationDay,
} from "./contentDates";

describe("event dates preserve the precision the author actually knows", () => {
  it.each(["2024", "2024-07", "2024-02-29", "0001-01-01"])(
    "accepts %s",
    value => {
      expect(normalizeEventFields({ eventDate: value }).eventDate).toBe(value);
    }
  );
  it.each([
    "2023-02-29",
    "2024-04-31",
    "0000",
    "2024-13",
    "2024-1",
    "2024-07-20T00:00:00Z",
    2024,
    true,
  ])("rejects %s", value => {
    expect(() => normalizeEventFields({ eventDate: value })).toThrow(
      /eventDate/
    );
  });
  it("normalizes blanks and validates equal-precision ranges", () => {
    expect(
      normalizeEventFields({ eventDate: " ", eventEndDate: null })
    ).toEqual({ eventDate: undefined, eventEndDate: undefined });
    expect(
      normalizeEventFields({ eventDate: "2024-07", eventEndDate: "2024-08" })
    ).toEqual({ eventDate: "2024-07", eventEndDate: "2024-08" });
    for (const data of [
      { eventEndDate: "2024" },
      { eventDate: "2024", eventEndDate: "2024-07" },
      { eventDate: "2025", eventEndDate: "2024" },
    ])
      expect(() => normalizeEventFields(data)).toThrow(/eventEndDate/);
  });
  it("formats partial dates and ranges without inventing a day", () => {
    expect(formatEventPeriod({ start: "2024" })).toBe("2024年");
    expect(formatEventPeriod({ start: "2024-07" })).toBe("2024年7月");
    expect(formatEventPeriod({ start: "2024-07-20", end: "2024-07-21" })).toBe(
      "2024年7月20日—2024年7月21日"
    );
    expect(formatEventPeriod({ start: "2024", end: "2024" })).toBe("2024年");
    expect(
      compareEventPeriods({ start: "2025" }, { start: "2024-12" })
    ).toBeGreaterThan(0);
  });
  it("keeps publication fallback explicit and uses the effective timezone", () => {
    const published = new Date("2026-03-31T18:00:00Z");
    expect(getRecordPeriod({ published, eventDate: "2024" })).toEqual({
      kind: "event",
      start: "2024",
    });
    expect(getRecordPeriod({ published })).toEqual({
      kind: "published",
      start: "2026-04-01",
    });
    expect(
      getRecordPeriod({ published, timezone: "America/Los_Angeles" }).start
    ).toBe("2026-03-31");
  });
});

describe("publication dates are instants, independent of the build machine timezone", () => {
  it("parses date-only and legacy local datetimes in the declared timezone", () => {
    vi.stubEnv("TZ", "America/Los_Angeles");
    expect(parsePublishedDate("2024-07-21").toISOString()).toBe(
      "2024-07-20T16:00:00.000Z"
    );
    expect(parsePublishedDate("2024/07/21 12:30").toISOString()).toBe(
      "2024-07-21T04:30:00.000Z"
    );
    expect(parsePublishedDate("2024-07-21T12:30:00+08:00").toISOString()).toBe(
      "2024-07-21T04:30:00.000Z"
    );
    expect(publicationDay(new Date("2024-07-20T16:30:00Z"))).toBe("2024-07-21");
    vi.unstubAllEnvs();
  });
  it.each([
    "2024-02-30",
    "2024-07-21 24:00",
    "2024-07-21T12:30:00+99:00",
    "",
    "yesterday",
  ])("rejects invalid publication %s", value => {
    expect(Number.isNaN(parsePublishedDate(value).getTime())).toBe(true);
  });
});
