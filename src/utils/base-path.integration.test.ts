import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { getPath } from "./getPath";
import { getAssetPath, stripBase, withBase } from "./withBase";

function source(path: string) {
  return readFileSync(path, "utf-8");
}

describe("base path integration", () => {
  it("keeps root deployment URLs unchanged while prefixing explicit /blog URLs", () => {
    expect(withBase("/posts/example", "/")).toBe("/posts/example");
    expect(withBase("/posts/example", "/blog")).toBe("/blog/posts/example");
    expect(getAssetPath("/favicon.png", "/blog")).toBe("/blog/favicon.png");
    expect(stripBase("/blog/posts/example", "/blog")).toBe("/posts/example");
  });

  it("keeps route params and collection slug semantics base-free", () => {
    expect(getPath("category/example", undefined, false, "/blog")).toBe(
      "/example"
    );

    const postPage = source("src/pages/posts/[...slug]/index.astro");
    expect(postPage).toContain("getPath(post.id, post.filePath, false)");
  });

  it("uses base-aware URLs at owned navigation and asset output sites", () => {
    const layout = source("src/layouts/Layout.astro");
    expect(layout).toContain('getAssetPath("/favicon.png")');
    expect(layout).toContain('withBase("/sitemap-index.xml")');
    expect(layout).toContain('getAssetPath("/app-controls.js")');
    expect(layout).toContain('withBase("/rss.xml")');

    const header = source("src/components/Header.astro");
    expect(header).toContain("stripBase(Astro.url.pathname)");
    expect(header).toContain('withBase("/favicon.png")');
    expect(header).toContain("href={withBase(item.href)}");
    expect(header).toContain('href={withBase("/rss.xml")}');

    expect(source("src/components/Tag.astro")).toContain(
      "href={withBase(`/posts/${tag}/`)}"
    );
    expect(source("src/pages/404.astro")).toContain('href={withBase("/")}');
    expect(source("src/utils/getCalendarEvents.ts")).toContain(
      "withBase(`/notes/${quarterKey}#date-${dateStr}`)"
    );
    expect(source("src/components/home/fragmentPreviews.ts")).toContain(
      "withBase("
    );
    expect(source("src/components/home/fragmentPreviews.ts")).toContain(
      "/notes#diary-"
    );
    expect(source("src/components/DiaryEntryReact.tsx")).toContain(
      "withBase(`/diary/${date}`)"
    );
    expect(source("src/components/diary/DiaryEntry.astro")).toContain(
      "withBase(`/diary/${date}`)"
    );
    expect(source("src/components/diary/DiaryTimelineItem.astro")).toContain(
      "withBase(path)"
    );
    expect(source("src/components/DiaryTimeline.tsx")).toContain(
      "fetch(withBase(`/api/diary/${nextPage}.json`))"
    );
    expect(source("src/components/diary/DiaryLoadMore.tsx")).toContain(
      "fetch(withBase(`/api/diary/${nextPage}.json`))"
    );
    expect(source("src/utils/parseEntry.ts")).toContain(
      'href="${withBase(finalHref)}"'
    );
    expect(source("src/utils/parseEntry.ts")).toContain(
      "withBaseIfRootRelative(src, base)"
    );

    const feeds = source("src/pages/feeds/index.astro");
    expect(feeds).toContain('getAssetPath("/data/feeds/default-avatar.svg")');
    expect(feeds).toContain('dataSourceUrl: withBase("/api/feeds.json")');
    expect(source("src/pages/api/feeds.json.ts")).toContain(
      'withBase("/data/feeds/feeds.json", base)'
    );

    expect(source("src/pages/archives/index.astro")).toContain(
      'Astro.redirect(`${import.meta.env.BASE_URL.replace(/\\/$/, "")}/404`)'
    );
    expect(source("src/components/BackButton.astro")).toContain(
      'const fallbackHref = withBase("/")'
    );
    expect(source("src/components/Card.astro")).toContain(
      "getAssetPath(`/${SITE.cover}`)"
    );
    expect(source("src/components/Card.astro")).toContain(
      'getAssetPath("/og.png")'
    );
    expect(source("astro.config.ts")).toContain("base: SITE.base");
  });

  it("adds base only at the final page markdown link output boundary", () => {
    const linkProcessor = source("src/utils/linkProcessor.ts");
    expect(linkProcessor).toContain(
      "return finalSlug ? `${routePrefix}/${finalSlug}${hashSuffix}` : href"
    );
    expect(linkProcessor).not.toContain("withBase(");

    const satteriLinks = source("src/markdown/plugins/links.ts");
    expect(satteriLinks).toContain(
      "includeBase ? withBase(resolvedUrl, base) : resolvedUrl"
    );
    expect(source("src/markdown/processor.ts")).toContain(
      "rssLinkProcessorPlugin"
    );

    const rss = source("src/pages/rss.xml.ts");
    expect(rss).not.toContain("withBase(");
  });
});
