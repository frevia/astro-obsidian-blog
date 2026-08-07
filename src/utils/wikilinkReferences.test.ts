import { describe, expect, it } from "vitest";
import type { WikilinkReference } from "./wikilinkGraph";
import { withBase } from "./withBase";
import {
  prepareWikilinkReferences,
  safeWikilinkHref,
} from "./wikilinkReferences";

function reference(href: string): WikilinkReference {
  return {
    id: href,
    title: "关联文章",
    slug: "related-post",
    href,
    label: "关联文章",
  };
}

describe("wikilink reference presentation", () => {
  it("accepts site-relative routes and preserves fragments", () => {
    expect(safeWikilinkHref(" /posts/example#section ")).toBe(
      withBase("/posts/example#section")
    );
  });

  it.each([
    "https://example.com/posts/example",
    "//example.com/posts/example",
    "javascript:alert(1)",
    "/posts\\example",
    "/posts/example\nunsafe",
  ])("rejects unsafe href %s", href => {
    expect(safeWikilinkHref(href)).toBeUndefined();
  });

  it("filters unsafe graph references before rendering", () => {
    const safe = reference("/posts/example");
    const prepared = prepareWikilinkReferences([
      safe,
      reference("https://example.com"),
    ]);

    expect(prepared).toEqual([
      { reference: safe, href: withBase("/posts/example") },
    ]);
  });
});
