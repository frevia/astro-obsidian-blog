import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Astro navigation prefetch", () => {
  it("uses hover prefetching instead of eagerly warming every route", () => {
    const config = readFileSync("astro.config.ts", "utf-8");
    const header = readFileSync("src/components/Header.astro", "utf-8");
    const card = readFileSync("src/components/Card.astro", "utf-8");
    const fragmentCard = readFileSync(
      "src/components/home/FragmentPreviewCard.astro",
      "utf-8"
    );

    expect(config).toContain('prefetch: { defaultStrategy: "hover" }');
    expect(config).not.toContain("prefetchAll: true");
    expect(header).toContain('data-astro-prefetch="hover"');
    expect(card).toContain(
      'data-astro-prefetch={isFeatured ? "viewport" : "tap"}'
    );
    expect(fragmentCard).toContain('data-astro-prefetch="tap"');
  });

  it("enables Astro 7's SVG optimizer for imported interface icons", () => {
    const config = readFileSync("astro.config.ts", "utf-8");

    expect(config).toContain("svgoOptimizer");
    expect(config).toContain("svgOptimizer: svgoOptimizer()");
  });
});
