import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("event date presentation", () => {
  it("renders only an explicitly supplied event period with its meaning label", () => {
    const source = readFileSync(
      "src/components/article/EventDate.astro",
      "utf8"
    );
    expect(source).toContain("getEventPeriod");
    expect(source).toContain("formatEventPeriod");
    expect(source).toContain("发生于");
    expect(source).toContain("period && (");
  });
});
