import { describe, expect, it } from "vitest";
import {
  getChineseHolidayName,
  isRealHolidayName,
  resolveDayTag,
} from "./dayMeta";

describe("isRealHolidayName", () => {
  it("returns false for regular weekend label", () => {
    expect(isRealHolidayName("周末")).toBe(false);
  });

  it("returns true for actual holiday label", () => {
    expect(isRealHolidayName("Spring Festival,春节,4")).toBe(true);
  });
});

describe("getChineseHolidayName", () => {
  it("extracts chinese segment", () => {
    expect(getChineseHolidayName("Spring Festival,春节,4")).toBe("春节");
  });
});

describe("resolveDayTag", () => {
  it("returns null for normal weekend", () => {
    expect(
      resolveDayTag({
        isInLieu: false,
        work: false,
        isWeekend: true,
        rawName: "周末",
      })
    ).toBeNull();
  });

  it("returns rest for holiday off day", () => {
    expect(
      resolveDayTag({
        isInLieu: false,
        work: false,
        isWeekend: false,
        rawName: "National Day,国庆节,4",
      })
    ).toBe("rest");
  });

  it("returns makeup for weekend work day", () => {
    expect(
      resolveDayTag({
        isInLieu: false,
        work: true,
        isWeekend: true,
        rawName: "工作日",
      })
    ).toBe("makeup");
  });

  it("returns inLieu with highest priority", () => {
    expect(
      resolveDayTag({
        isInLieu: true,
        work: true,
        isWeekend: true,
        rawName: "工作日",
      })
    ).toBe("inLieu");
  });
});
