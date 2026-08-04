import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const source = (path: string) => readFileSync(resolve(root, path), "utf-8");

describe("editorial home and post list contracts", () => {
  it("keeps the existing diary hydration boundary below the SSR editorial area", () => {
    const index = source("pages/index.astro");

    expect(index).toContain("<HomeEditorial");
    expect(index).toContain("buildFragmentPreviews(initialParsedEntries, 3)");
    expect(index).toContain("<DiaryTimeline");
    expect(index.match(/client:(?:load|idle|visible|media|only)/g)).toEqual([
      "client:idle",
    ]);
  });

  it("keeps post sorting, pagination and a zero-JS editorial list", () => {
    const posts = source("pages/posts/[...page].astro");

    expect(posts).toContain("paginate(getSortedPosts(posts)");
    expect(posts).toContain("pageSize: SITE.postPerPage");
    expect(posts).toContain("<EditorialYear");
    expect(posts).toContain("<Pagination {page} />");
    expect(posts).not.toMatch(/client:(?:load|idle|visible|media|only)/);
  });

  it("publishes content and view-transition hooks on shared cards", () => {
    const card = source("components/Card.astro");

    expect(card).toContain("data-content-kind={contentKind}");
    expect(card).toContain("data-transition-title={titleTransitionName}");
    expect(card).toContain("data-transition-cover={coverTransitionName}");
    expect(card).toContain("transition:name={titleTransitionName}");
    expect(card).toContain("transition:name={coverTransitionName}");
    expect(card).toContain("post-card-editorial");
    expect(card).toContain(
      "const coverWidth = isFeatured ? 720 : isStandard ? 88 : 432;"
    );
    expect(card).toContain(
      "const coverHeight = isFeatured ? 405 : isStandard ? 88 : 243;"
    );
    expect(card).toContain('"aspect-video w-full rounded-xl sm:w-[52%]"');
    expect(card).toContain('"aspect-video w-full rounded-xl sm:w-64"');
    expect(card).toContain("sm:flex-row sm:items-center sm:gap-6");
    expect(card).toContain("sm:flex-row-reverse sm:items-center sm:gap-6");
    expect(card).not.toContain("sm:items-stretch");
    expect(card).toContain("object-cover");
    expect(card).not.toContain("aspect-[16/10]");
  });
});
