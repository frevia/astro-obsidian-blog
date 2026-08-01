import { describe, expect, it, vi } from "vitest";

describe("getPath", () => {
  it("adds Astro base only for href output", async () => {
    vi.resetModules();
    const { getPath } = await import("./getPath");

    expect(getPath("category/slug", undefined, true, "/blog")).toBe(
      "/blog/posts/slug"
    );
    expect(getPath("category/slug", undefined, false, "/blog")).toBe("/slug");
  });

  it("keeps only the last slug segment", async () => {
    vi.resetModules();
    const { getPath } = await import("./getPath");

    expect(getPath("a/b/c", "/unused/path.md", true, "/blog")).toBe(
      "/blog/posts/c"
    );
  });
});
