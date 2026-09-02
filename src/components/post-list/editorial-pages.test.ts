import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const source = (path: string) => readFileSync(resolve(root, path), "utf-8");

describe("editorial home and post list contracts", () => {
  it("keeps the diary feed static below the SSR editorial area", () => {
    const index = source("pages/index.astro");

    expect(index).toContain("<HomeEditorial");
    expect(index).toContain("buildFragmentPreviews(initialParsedEntries, 3)");
    expect(index).toContain("<DiaryFeed");
    expect(index).toContain("<DiaryLoadMore");
    expect(index.match(/client:(?:load|idle|visible|media|only)/g)).toEqual([
      "client:visible",
    ]);
    expect(index).toContain('rootMargin: "800px"');
    expect(index).not.toContain("<DiaryTimeline");
  });

  it("keeps post sorting, pagination and a zero-JS editorial list", () => {
    const posts = source("pages/posts/[...page].astro");

    expect(posts).toContain("paginate(getSortedPosts(posts)");
    expect(posts).toContain("pageSize: SITE.postPerPage");
    expect(posts).toContain("<EditorialYear");
    expect(posts).toContain("<Pagination {page} />");
    expect(posts).toContain("const DEFAULT_VISIBLE_TAGS = 8;");
    expect(posts).not.toMatch(/client:(?:load|idle|visible|media|only)/);
  });

  it("uses a featured first post and a single-column editorial sequence per year", () => {
    const editorialYear = source("components/post-list/EditorialYear.astro");

    expect(editorialYear).toContain(
      'presentation={index === 0 ? "featured" : "editorial"}'
    );
    expect(editorialYear).not.toContain("mediaAlign=");
    expect(editorialYear).toContain('class="flex min-w-0 flex-col gap-6"');
    expect(editorialYear).not.toContain('class="grid');
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
      "const coverWidth = isFeatured ? 720 : isStandard ? 88 : 480;"
    );
    expect(card).toContain(
      "const coverHeight = isFeatured ? 405 : isStandard ? 88 : 360;"
    );
    expect(card).toContain("const hasAuthoredCover = Boolean(data.cover);");
    expect(card).toContain("const cardCover = isStandard");
    expect(card).toContain("data.cover ?? fallbackCover");
    expect(card).toContain('"aspect-[4/3] w-24 rounded-xl sm:w-48"');
    expect(card).not.toContain('"aspect-video w-full rounded-xl sm:w-64"');
    expect(card).toContain('"aspect-video w-full rounded-xl sm:w-[52%]"');
    expect(card).toContain(
      'isFeatured && Boolean(cardCover) && mediaAlign === "start"'
    );
    expect(card).toContain(
      'isFeatured && Boolean(cardCover) && mediaAlign === "end"'
    );
    expect(card).toContain('"flex-row items-start gap-4 sm:gap-6"');
    expect(card).toContain('"line-clamp-2 hidden text-sm leading-6 sm:block"');
    expect(card).not.toContain("sm:items-stretch");
    expect(card).toContain("object-cover");
    expect(card).toContain("object-contain");
    expect(card).toContain("decorative");
    expect(card).toContain("ariaHidden");
    expect(card).toContain("preserveAspect={hasAuthoredCover}");
    expect(card).toContain('fit="contain"');
    expect(card.match(/fit="cover"/g)).toHaveLength(2);
    expect(card.match(/style="height: 100%;"/g)).toHaveLength(3);
    expect(card).toContain("blur-md");
    expect(card).toContain("object-contain p-2");
    expect(card).toContain("cardCover && (");
    expect(card).not.toContain("aspect-[16/10]");
  });

  it("centralizes string and local image rendering in the card cover component", () => {
    const coverImage = source("components/CardCoverImage.astro");
    const remotePreservingBranch = coverImage.match(
      /typeof src === "string" && preserveAspect \? \(\s*(<Image[\s\S]*?)\s*\) : typeof src/
    )?.[1];
    const localPreservingBranch = coverImage.match(
      /\) : preserveAspect \? \(\s*(<Image[\s\S]*?)\s*\) : \(/
    )?.[1];

    expect(coverImage).toContain("src: string | ImageMetadata");
    expect(coverImage).toContain('typeof src === "string"');
    expect(coverImage).toContain('typeof src === "string" && preserveAspect');
    expect(coverImage).toContain("inferSize");
    expect(coverImage).toContain(") : preserveAspect ? (");
    expect(coverImage).toContain('format="webp"');
    expect(coverImage).toContain("quality={82}");
    expect(coverImage).toContain('fit?: "fill" | "contain" | "cover"');
    expect(coverImage.match(/fit=\{fit\}/g)).toHaveLength(4);
    expect(coverImage).toContain("style?: string");
    expect(coverImage.match(/style=\{style\}/g)).toHaveLength(4);
    expect(coverImage).toContain(
      'aria-hidden={hiddenFromAccessibilityTree ? "true" : undefined}'
    );
    expect(remotePreservingBranch).toContain("inferSize");
    expect(remotePreservingBranch).not.toContain("height={height}");
    expect(localPreservingBranch).toContain("width={width}");
    expect(localPreservingBranch).not.toContain("height={height}");
  });
});
