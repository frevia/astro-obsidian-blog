import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
  resolve(import.meta.dirname, "content-theme.css"),
  "utf8"
);

describe("content-aware visual theme", () => {
  it("defines stable content kinds for the visual palette", () => {
    for (const kind of ["film", "book", "music", "travel", "tech"]) {
      expect(source).toContain(`[data-content-kind="${kind}"]`);
      expect(source).toContain("--page-accent:");
      expect(source).toContain("--page-accent-soft:");
    }
  });

  it("keeps the default site accent as the safe fallback", () => {
    expect(source).toContain("--page-accent: var(--accent)");
    expect(source).toContain("--page-surface: var(--surface)");
    expect(source).toContain("prefers-reduced-motion: reduce");
  });
});
