import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { classifyCoverOrientation } from "./coverPresentation";

describe("editorial cover presentation", () => {
  it("classifies the real portrait book-cover ratio", () => {
    expect(classifyCoverOrientation({ width: 1313, height: 1855 })).toBe(
      "portrait"
    );
  });

  it("classifies the real landscape article-cover ratio", () => {
    expect(classifyCoverOrientation({ width: 1693, height: 929 })).toBe(
      "landscape"
    );
  });

  it("keeps near-square covers balanced", () => {
    expect(classifyCoverOrientation({ width: 1000, height: 900 })).toBe(
      "balanced"
    );
  });

  it("uses the safe fallback when dimensions are unavailable", () => {
    expect(classifyCoverOrientation("https://example.com/cover.jpg")).toBe(
      "unknown"
    );
  });
});

// Featured cards must use the same orientation information as editorial cards.
it("keeps featured portrait covers uncropped", () => {
  const card = readFileSync("src/components/Card.astro", "utf-8");
  expect(card).toContain("const coverOrientation = !isStandard");
  expect(card).toContain('"w-36 self-center rounded-xl sm:w-44"');
  expect(card).toContain('isEditorial || coverOrientation === "portrait"');
  expect(card).not.toContain("relative z-10 block h-full w-full object-cover");
});
