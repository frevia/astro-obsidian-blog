import { describe, expect, it } from "vitest";

import { getAssetPath, stripBase, withBase } from "./withBase";

describe("withBase utilities", () => {
  it.each([
    ["/", "/blog", "/blog"],
    ["/posts/foo", "/blog", "/blog/posts/foo"],
    ["posts/foo", "/blog/", "/blog/posts/foo"],
    ["/posts//foo", "/blog/", "/blog/posts/foo"],
    ["/posts/foo?draft=1#top", "/blog", "/blog/posts/foo?draft=1#top"],
    ["?q=astro", "/blog", "?q=astro"],
    ["#top", "/blog", "#top"],
    ["https://example.com/a", "/blog", "https://example.com/a"],
    ["mailto:hi@example.com", "/blog", "mailto:hi@example.com"],
    ["tel:+15555550100", "/blog", "tel:+15555550100"],
    ["data:text/plain,hello", "/blog", "data:text/plain,hello"],
    ["blob:https://example.com/id", "/blog", "blob:https://example.com/id"],
    ["//cdn.example.com/a.css", "/blog", "//cdn.example.com/a.css"],
    ["/blog/posts/foo", "/blog", "/blog/posts/foo"],
  ])("prefixes %s with base %s", (path, base, expected) => {
    expect(withBase(path, base)).toBe(expected);
  });

  it.each([
    ["/blog/posts/foo", "/blog", "/posts/foo"],
    ["/blog", "/blog", "/"],
    ["/posts/foo", "/", "/posts/foo"],
    ["/assets/file.css?x=1", "/blog", "/assets/file.css?x=1"],
    ["mailto:hi@example.com", "/blog", "mailto:hi@example.com"],
    ["?q=astro", "/blog", "?q=astro"],
    ["#top", "/blog", "#top"],
  ])("strips base %s with base %s", (path, base, expected) => {
    expect(stripBase(path, base)).toBe(expected);
  });

  it("aliases asset path generation to base prefixing", () => {
    expect(getAssetPath("assets/site.css", "/blog/")).toBe(
      "/blog/assets/site.css"
    );
  });
});
