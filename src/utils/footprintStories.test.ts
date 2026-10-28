import { describe, expect, it } from "vitest";
import { groupFootprintStories } from "./footprintStories";
import type { FootprintRecord } from "@/components/FootprintMap";

const record = (
  url: string,
  name: string,
  fields: Partial<FootprintRecord> = {}
): FootprintRecord => ({ title: url, url, name, lng: 120, lat: 30, ...fields });

describe("footprint stories", () => {
  it("shows each article once and preserves its distinct places", () => {
    const rows = groupFootprintStories([
      record("/trip", "山"),
      record("/trip", "湖"),
      record("/trip", "山"),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].places).toEqual(["山", "湖"]);
  });
  it("orders by explicit event period, uses local publication fallback and leaves unknown dates last", () => {
    const rows = groupFootprintStories([
      record("/undated", "山"),
      record("/event", "湖", {
        date: "2026-10-01",
        eventDate: "2024-03",
        eventEndDate: "2024-04",
      }),
      record("/published", "海", {
        date: "2025-03-31T18:00:00Z",
        timezone: "Asia/Shanghai",
      }),
      record("/invalid", "河", { date: "invalid" }),
    ]);
    expect(rows.map(row => row.post.url)).toEqual([
      "/published",
      "/event",
      "/undated",
      "/invalid",
    ]);
    expect(rows[0].period).toEqual({ kind: "published", start: "2025-04-01" });
    expect(rows[1].period).toEqual({
      kind: "event",
      start: "2024-03",
      end: "2024-04",
    });
    expect(rows[2].period).toBeUndefined();
    expect(groupFootprintStories([])).toEqual([]);
  });
});
