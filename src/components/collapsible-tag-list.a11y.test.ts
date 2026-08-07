import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("CollapsibleTagList integration and accessibility contract", () => {
  const componentPath = resolve(
    import.meta.dirname,
    "CollapsibleTagList.astro"
  );
  const postDetailsPath = resolve(
    import.meta.dirname,
    "../layouts/PostDetails.astro"
  );

  it("uses overflow detection and accessible expand/collapse semantics", () => {
    const source = readFileSync(componentPath, "utf-8");

    expect(source).toContain("data-collapsible-tag-list-root");
    expect(source).toContain("data-collapsible-tag-list-content");
    expect(source).toContain("data-collapsible-tag-list-toggle");
    expect(source).toContain("aria-controls");
    expect(source).toContain("aria-expanded");
    expect(source).toContain("scrollHeight > content.clientHeight");
    expect(source).toContain(
      'toggle.textContent = isExpanded ? "收起" : "展开"'
    );
    expect(source).toContain("root.dataset.collapsibleTagListInitialized");
    expect(source).toContain("initCollapsibleTagLists();");
  });

  it("removes tags block from post details page", () => {
    const source = readFileSync(postDetailsPath, "utf-8");

    expect(source).not.toContain(
      'import CollapsibleTagList from "@/components/CollapsibleTagList.astro"'
    );
    expect(source).not.toContain("<CollapsibleTagList");
  });
});
