import { describe, expect, it } from "vitest";
import { estimateReadingMinutes } from "./readingTime";

describe("estimateReadingMinutes", () => {
  it("returns at least one minute for empty content", () => {
    expect(estimateReadingMinutes("")).toBe(1);
  });

  it("counts CJK characters and Latin words while ignoring code fences", () => {
    const content = [
      "你好世界",
      "This is a short paragraph.",
      "```ts\nconst ignored = true;\n```",
    ].join("\n\n");

    expect(estimateReadingMinutes(content, 4)).toBe(3);
  });
});
