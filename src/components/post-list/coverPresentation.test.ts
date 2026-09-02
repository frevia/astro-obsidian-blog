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
