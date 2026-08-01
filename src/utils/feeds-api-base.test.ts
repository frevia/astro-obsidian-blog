import { describe, expect, it } from "vitest";

import { getStaticFeedsUrl } from "@/pages/api/feeds.json";

describe("feeds API static fallback URL", () => {
  it("prefixes the static fallback with Astro base", () => {
    expect(getStaticFeedsUrl("https://example.com", "/blog")).toBe(
      "https://example.com/blog/data/feeds/feeds.json"
    );
  });

  it("keeps root deployments unchanged", () => {
    expect(getStaticFeedsUrl("https://example.com", "/")).toBe(
      "https://example.com/data/feeds/feeds.json"
    );
  });
});
