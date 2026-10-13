import { describe, it, expect } from "vitest";
import { fixAssetCacheOrder } from "../../scripts/fix-vercel-asset-cache.mjs";

describe("Vercel static asset cache", () => {
  it("applies immutable caching before filesystem without changing API/HTML routing", () => {
    const filesystem = { handle: "filesystem" };
    const cache = {
      src: "^/_astro/(.*)$",
      headers: { "cache-control": "public, max-age=31536000, immutable" },
      continue: true,
    };
    const api = { src: "^/api/feeds$", dest: "_render" };
    const config = { version: 3, routes: [filesystem, cache, api] };
    expect(fixAssetCacheOrder(config).routes).toEqual([cache, filesystem, api]);
    expect(fixAssetCacheOrder(config).routes).toEqual([cache, filesystem, api]);
  });
  it("fails visibly when the adapter output no longer matches", () => {
    expect(() => fixAssetCacheOrder({ routes: [] })).toThrow(
      "Vercel asset routes changed"
    );
  });
});
