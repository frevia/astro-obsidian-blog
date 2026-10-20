import { describe, expect, it } from "vitest";
import { parseJournalTimelineHeading } from "./journalTimeline";

describe("parseJournalTimelineHeading", () => {
  it("parses a dated chapter with a period and either separator", () => {
    expect(
      parseJournalTimelineHeading("2024-07-20 傍晚｜到山顶的村子")
    ).toEqual({
      date: "2024-07-20",
      period: "傍晚",
      title: "到山顶的村子",
    });
    expect(parseJournalTimelineHeading("2024-07-20|山顶")).toEqual({
      date: "2024-07-20",
      period: "",
      title: "山顶",
    });
  });

  it.each([
    "2024-02-30 上午｜无效日期",
    "2024-07-20 下午｜   ",
    "2024-7-20 上午｜格式不严格",
    "普通章节",
  ])("leaves unsupported heading text unchanged: %s", text => {
    expect(parseJournalTimelineHeading(text)).toBeUndefined();
  });
});
