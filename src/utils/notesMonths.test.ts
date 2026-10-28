import { describe, expect, it } from "vitest";
import { getNotesMonth, groupNotesMonths } from "./notesMonths";

describe("notesMonths", () => {
  it("extracts valid dates from paths and ignores invalid ids", () => {
    expect(getNotesMonth("2024/2024-01-31.md")).toBe("2024-01");
    expect(getNotesMonth("nested/2023-12-01.md")).toBe("2023-12");
    expect(getNotesMonth("not-a-date.md")).toBeUndefined();
    expect(getNotesMonth("2024-02-30.md")).toBeUndefined();
  });

  it("groups months and dates in descending order across years", () => {
    expect(
      groupNotesMonths([
        "2023-12-31.md",
        "2024/2024-01-03.md",
        "2024-01-01.md",
        "2023-10-02.md",
        "bad.md",
      ])
    ).toEqual([
      {
        year: "2024",
        months: [{ month: "2024-01", count: 2 }],
      },
      {
        year: "2023",
        months: [
          { month: "2023-12", count: 1 },
          { month: "2023-10", count: 1 },
        ],
      },
    ]);
    expect(groupNotesMonths([])).toEqual([]);
  });
});
