import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("MediaCard render contract", () => {
  it("builds unique half-star clipPath ids per card", () => {
    const source = readFileSync(resolve(import.meta.dirname, "MediaCard.tsx"), "utf-8");

    expect(source).toContain("half-star-${id ?? title}-${star}");
    expect(source).toContain("clipPath={`url(#${starClipId})`}");
  });
});
