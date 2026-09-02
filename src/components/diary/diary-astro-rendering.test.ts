import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import DiaryImageGallery from "./DiaryImageGallery";

const source = (file: string) =>
  readFileSync(resolve(import.meta.dirname, file), "utf-8");

describe("Astro diary rendering contracts", () => {
  it("renders image anchors and img elements before gallery hydration", () => {
    const html = renderToStaticMarkup(
      React.createElement(DiaryImageGallery, {
        images: [
          {
            alt: "湖边",
            src: "/blog/_astro/lake-thumb.webp",
            title: "湖边",
            original: "/blog/attachments/lake.webp",
            width: 1200,
            height: 800,
          },
        ],
      })
    );

    expect(html).toContain('href="/blog/attachments/lake.webp"');
    expect(html).toContain('src="/blog/_astro/lake-thumb.webp"');
    expect(html).toContain('alt="湖边"');
    expect(html).not.toContain("isImagesLoaded");
    expect(html).not.toContain("等待 effect");
  });

  it("keeps the Astro time item static except for local enhancements", () => {
    const item = source("DiaryTimelineItem.astro");

    expect(item).toContain('MediaCard from "@/components/MediaCard.astro"');
    expect(item).toContain("DiaryImageGallery");
    expect(item).toContain('client:visible={{ rootMargin: "300px" }}');
    expect(item).toContain("hasGalleryEnhancement");
    expect(item).toContain("set:html={text}");
    expect(item).toContain("set:html={postText}");
    expect(item).toContain("withBase(path)");
  });

  it("hydrates comments only when their static entry reaches the viewport", () => {
    const entry = source("DiaryEntry.astro");

    expect(entry).toContain('client:visible={{ rootMargin: "300px" }}');
    expect(entry).toContain("collapsedWhenEmpty");
    expect(entry).toContain("data-diary-date");
    expect(entry).not.toContain("<script");

    const feed = source("DiaryFeed.astro");
    expect(feed).toContain("Asia/Shanghai");
    expect(feed).toContain('"astro:page-load"');
    expect(feed.match(/<script>/g)).toHaveLength(1);
  });

  it("does not pass the static first page into the load-more island", () => {
    const loadMore = source("DiaryLoadMore.tsx");

    expect(loadMore).toContain("additionalEntries");
    expect(loadMore).toContain("initialCount");
    expect(loadMore).toContain("DiaryFeedList");
    expect(loadMore).toContain("DiaryLoadState");
    expect(loadMore).toContain("loadingRequestRef");
    expect(loadMore).not.toContain("initialEntries");
  });

  it("renders static feed wrappers without a React boundary", () => {
    const feed = source("DiaryFeed.astro");

    expect(feed).toContain("<DiaryEntry");
    expect(feed).toContain("entries.map");
    expect(feed).toContain("diary-entry-reveal");
    expect(feed).not.toMatch(/client:(?:load|idle|visible|media|only)/);
  });
});
