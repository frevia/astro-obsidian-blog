import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const globalStyles = readFileSync("src/styles/global.css", "utf-8");

describe("disintegration image fallback", () => {
  it("keeps the SSR image visible when island hydration is unavailable", () => {
    const imageRule =
      globalStyles.match(/\.disintegration-img\s*\{[^}]*\}/)?.[0] ?? "";

    expect(imageRule).toContain("opacity: 1");
  });
});
