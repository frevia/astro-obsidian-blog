import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("ArticleLightbox integration", () => {
  it("is mounted on blog post details and favorites details", () => {
    const postDetails = readFileSync(
      resolve(import.meta.dirname, "../layouts/PostDetails.astro"),
      "utf-8"
    );
    const favoriteDetails = readFileSync(
      resolve(import.meta.dirname, "../pages/favorites/[...slug]/index.astro"),
      "utf-8"
    );

    expect(postDetails).toContain(
      'import ArticleLightbox from "@/components/ArticleLightbox.astro"'
    );
    expect(postDetails).toContain("<ArticleLightbox />");
    expect(favoriteDetails).toContain(
      'import ArticleLightbox from "@/components/ArticleLightbox.astro"'
    );
    expect(favoriteDetails).toContain("<ArticleLightbox />");
  });

  it("removes photosuite without changing diary lightgallery support", () => {
    const astroConfig = readFileSync(
      resolve(import.meta.dirname, "../../astro.config.ts"),
      "utf-8"
    );
    const layout = readFileSync(
      resolve(import.meta.dirname, "../layouts/Layout.astro"),
      "utf-8"
    );
    const packageJson = readFileSync(
      resolve(import.meta.dirname, "../../package.json"),
      "utf-8"
    );
    const timelineItem = readFileSync(
      resolve(import.meta.dirname, "TimelineItemReact.tsx"),
      "utf-8"
    );

    expect(astroConfig).not.toContain("photosuite");
    expect(layout).not.toContain("photosuite");
    expect(packageJson).not.toContain('"photosuite"');
    expect(timelineItem).toContain('await import("lightgallery")');
  });
});
