import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const source = (path: string) => readFileSync(resolve(root, path), "utf-8");

describe("editorial home and post list contracts", () => {
  it("keeps the home page focused on the SSR editorial selection", () => {
    const index = source("pages/index.astro");

    expect(index).toContain("<HomeEditorial");
    expect(index).toContain("buildFragmentPreviews(initialParsedEntries, 3)");
    expect(index).not.toContain("<DiaryFeed");
    expect(index).not.toContain("<DiaryLoadMore");
    expect(index).not.toContain("client:");
    expect(index).not.toContain("<DiaryTimeline");
  });

  it("moves the full Notes feed and pagination island to /notes", () => {
    const notes = source("pages/notes/index.astro");

    expect(notes).toContain("<ArchiveHero");
    expect(notes).toContain("<DiaryFeed");
    expect(notes).toContain("<DiaryLoadMore");
    expect(notes.match(/client:(?:load|idle|visible|media|only)/g)).toEqual([
      "client:visible",
    ]);
    expect(notes).toContain('rootMargin: "800px"');
    expect(notes).toContain('aria-label="Notes 时间线"');
    expect(notes).not.toContain("<HomeEditorial");
  });

  it("keeps quarterly Notes pages static and preserves old diary redirects", () => {
    const notesQuarter = source("pages/notes/[...page].astro");
    const legacyQuarter = source("pages/diary/[...page].astro");

    expect(notesQuarter).toContain("<DiaryFeed");
    expect(notesQuarter).toContain("/notes/");
    expect(notesQuarter).toContain("newerQuarter");
    expect(notesQuarter).toContain("olderQuarter");
    expect(notesQuarter).not.toMatch(/client:(?:load|idle|visible|media|only)/);
    expect(legacyQuarter).toContain("Astro.redirect");
    expect(legacyQuarter).toContain("import.meta.env.BASE_URL");
    expect(legacyQuarter).toContain("/notes/");
    expect(legacyQuarter).not.toContain("<DiaryFeed");
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
    expect(card).toContain("data-cover-orientation={isEditorial");
    expect(card).toContain("data-transition-title={titleTransitionName}");
    expect(card).toContain("data-transition-cover={coverTransitionName}");
    expect(card).toContain("transition:name={titleTransitionName}");
    expect(card).toContain("transition:name={coverTransitionName}");
    expect(card).toContain("post-card-editorial");
    expect(card).toContain("classifyCoverOrientation(data.cover)");
    expect(card).toContain('coverOrientation === "portrait"');
    expect(card).toContain('coverOrientation === "landscape"');
    expect(card).toContain("const editorialCoverSizes =");
    expect(card).toContain("const hasAuthoredCover = Boolean(data.cover);");
    expect(card).toContain("const cardCover = isStandard");
    expect(card).toContain("data.cover ?? fallbackCover");
    expect(card).not.toContain('"aspect-[4/3] w-24 rounded-xl sm:w-48"');
    expect(card).toContain('"w-24 self-center rounded-xl sm:w-40"');
    expect(card).toContain(
      '"w-full self-center rounded-xl sm:w-[42%] sm:max-w-80"'
    );
    expect(card).toContain('"aspect-video w-full rounded-xl sm:w-[52%]"');
    expect(card).toContain(
      'isFeatured && Boolean(cardCover) && mediaAlign === "start"'
    );
    expect(card).toContain(
      'isFeatured && Boolean(cardCover) && mediaAlign === "end"'
    );
    expect(card).toContain('"flex-row items-stretch gap-4 sm:gap-6"');
    expect(card).toContain(
      '"flex-col gap-4 sm:flex-row sm:items-stretch sm:gap-6"'
    );
    expect(card).toContain('"line-clamp-2 hidden text-sm leading-6 sm:block"');
    expect(card).toContain("sm:items-stretch");
    expect(card).toContain("width: 100%");
    expect(card).toContain("height: auto");
    expect(card).toContain("margin: 0");
    expect(card).toContain("object-cover");
    expect(card).toContain("object-contain");
    expect(card).not.toContain("decorative");
    expect(card).not.toContain("ariaHidden");
    expect(card).toContain("preserveAspect={hasAuthoredCover}");
    expect(card).toContain('fit="contain"');
    expect(card.match(/fit="cover"/g)).toHaveLength(1);
    expect(card.match(/style="height: 100%;"/g)).toHaveLength(1);
    expect(card).toContain('style={isEditorial ? undefined : "height: 100%;"}');
    expect(card).not.toContain("blur-md");
    expect(card).toContain("post-card-cover-frame");
    expect(card).not.toContain("!isEditorial && (");
    expect(card).not.toContain("post-card-cover-backdrop");
    expect(card).toContain("post-card-cover-image");
    expect(card).not.toContain(".post-card-cover-frame::before");
    expect(card).not.toContain(".post-card-cover-frame::after");
    expect(card).toContain('"border border-border/60 bg-muted/15": isStandard');
    expect(card).toContain(":global(.post-card-cover-image)");
    expect(card).toContain("animation: none");
    expect(card).toContain("transform: translateY(-2px)");
    expect(card).toContain("@media (hover: hover) and (pointer: fine)");
    expect(card).toContain("background: var(--interactive-hover)");
    expect(card).not.toContain("translateY(-2px) scale(1.025)");
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
