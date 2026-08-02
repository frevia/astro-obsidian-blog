import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("header navigation layout", () => {
  it("keeps desktop navigation labels on one line during font/view transitions", () => {
    const source = readFileSync("src/components/Header.astro", "utf-8");

    expect(source).toContain("whitespace-nowrap text-foreground/85");
    expect(source).toContain("transition:persist={useClientRouterTransitions}");
    expect(source).toContain('alt=""');
  });
});
