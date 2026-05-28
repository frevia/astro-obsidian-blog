import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("CollapsibleTagList integration and accessibility contract", () => {
  const componentPath = resolve(import.meta.dirname, "CollapsibleTagList.astro");
  const postDetailsPath = resolve(import.meta.dirname, "../layouts/PostDetails.astro");
  const favoriteDetailsPath = resolve(
    import.meta.dirname,
    "../pages/favorites/[...slug]/index.astro"
  );

  it("uses overflow detection and accessible expand/collapse semantics", () => {
    const source = readFileSync(componentPath, "utf-8");

    expect(source).toContain("data-collapsible-tag-list-root");
    expect(source).toContain("data-collapsible-tag-list-content");
    expect(source).toContain("data-collapsible-tag-list-toggle");
    expect(source).toContain("aria-controls");
    expect(source).toContain("aria-expanded");
    expect(source).toContain("scrollHeight > content.clientHeight");
    expect(source).toContain('toggle.textContent = isExpanded ? "收起" : "展开"');
  });

  it("replaces post details tags rendering with CollapsibleTagList", () => {
    const source = readFileSync(postDetailsPath, "utf-8");

    expect(source).toContain('import CollapsibleTagList from "@/components/CollapsibleTagList.astro"');
    expect(source).toContain(
      '<CollapsibleTagList tags={tags} class="rounded-lg border border-border/70 bg-surface-muted px-3 py-2" />'
    );
    expect(source).not.toContain("{tags.map(tag => <Tag tag={slugifyStr(tag)} tagName={tag} />)}");
  });

  it("adds CollapsibleTagList to favorite details page", () => {
    const source = readFileSync(favoriteDetailsPath, "utf-8");

    expect(source).toContain('import CollapsibleTagList from "@/components/CollapsibleTagList.astro"');
    expect(source).toContain(
      '<CollapsibleTagList tags={tags} class="rounded-lg border border-border/70 bg-surface-muted px-3 py-2" />'
    );
  });
});
