import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const OWNED_SOURCE_FILES = [
  "astro.config.ts",
  "src/layouts/Layout.astro",
  "src/styles/global.css",
  "src/utils/generateOgImages.ts",
  "src/utils/loadLocalFont.ts",
  "src/utils/og-templates/post.js",
  "src/utils/og-templates/site.js",
  "src/pages/og.png.ts",
  "src/pages/posts/[...slug]/cover.png.ts",
  "src/pages/posts/[...slug]/index.png.ts",
];

describe("owned font sources", () => {
  it("do not reference remote font CDNs", () => {
    const source = OWNED_SOURCE_FILES.map(file =>
      readFileSync(file, "utf8")
    ).join("\n");

    expect(source).not.toMatch(
      /fonts\.googleapis\.com|fonts\.gstatic\.com|api\.fontsource\.org|cdn\.jsdelivr\.net/
    );
  });

  it("does not preload all Astro page font shards from Layout", () => {
    const layout = readFileSync("src/layouts/Layout.astro", "utf8");

    expect(layout).toContain('<Font cssVariable="--font-noto-sans-sc" />');
    expect(layout).toContain('<Font cssVariable="--font-noto-serif-sc" />');
    expect(layout).not.toMatch(/<Font[^>]+preload/);
  });
});
