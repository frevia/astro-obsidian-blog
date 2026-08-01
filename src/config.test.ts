import { beforeAll, describe, expect, it, vi } from "vitest";

import { defineAstroPaperConfig } from "./types/config";

vi.mock("@/astro-paper.config", async () => {
  const config = await import("../astro-paper.config");
  return { default: config.default };
});

let moduleExports: typeof import("./config");

beforeAll(async () => {
  moduleExports = await import("./config");
});

describe("AstroPaper config", () => {
  it("resolves defaults for a minimal site config", async () => {
    const { resolveAstroPaperConfig } = moduleExports;
    const resolved = resolveAstroPaperConfig(
      defineAstroPaperConfig({
        site: {
          url: "https://example.com",
          title: "Example",
          description: "Minimal",
          author: "Author",
        },
      })
    );

    expect(resolved).toMatchObject({
      site: {
        base: "/",
        ogImage: "",
        lang: "en",
        timezone: "UTC",
        dir: "ltr",
      },
      posts: {
        perPage: 4,
        perIndex: 4,
        scheduledPostMargin: 15 * 60 * 1000,
      },
      features: {
        lightAndDarkMode: true,
        dynamicOgImage: true,
        showArchives: true,
        showBackButton: true,
        editPost: {
          enabled: false,
          url: "",
        },
        search: "pagefind",
      },
      local: {
        content: {
          blogPath: "src/content/posts",
          diaryPath: "src/content/diary",
          clipPath: "src/content/clip",
        },
        showCalendar: false,
        createdAt: "1970-01-01",
        feeds: {
          perIndex: 12,
          perPage: 12,
        },
        rss: {
          fetchDuringBuild: false,
        },
        comments: {
          enabled: false,
        },
        editPost: {
          text: "Edit page",
        },
      },
    });
  });

  it("uses google verification from env unless root config is explicit", () => {
    const { resolveAstroPaperConfig } = moduleExports;
    const baseInput = defineAstroPaperConfig({
      site: {
        url: "https://example.com",
        title: "Example",
        description: "Minimal",
        author: "Author",
      },
    });

    expect(
      resolveAstroPaperConfig(baseInput, {
        PUBLIC_GOOGLE_SITE_VERIFICATION: "env-token",
      }).site.googleVerification
    ).toBe("env-token");

    expect(
      resolveAstroPaperConfig(
        {
          ...baseInput,
          site: {
            ...baseInput.site,
            googleVerification: "explicit-token",
          },
        },
        { PUBLIC_GOOGLE_SITE_VERIFICATION: "env-token" }
      ).site.googleVerification
    ).toBe("explicit-token");
  });

  it("resolves the optional Astro base path with a root default", () => {
    const { resolveAstroPaperConfig } = moduleExports;
    const baseInput = defineAstroPaperConfig({
      site: {
        url: "https://example.com",
        title: "Example",
        description: "Minimal",
        author: "Author",
      },
    });

    expect(resolveAstroPaperConfig(baseInput).site.base).toBe("/");
    expect(
      resolveAstroPaperConfig({
        ...baseInput,
        site: {
          ...baseInput.site,
          base: "/blog",
        },
      }).site.base
    ).toBe("/blog");
  });

  it("falls back to google verification env when root config is an empty string", () => {
    const { resolveAstroPaperConfig } = moduleExports;

    expect(
      resolveAstroPaperConfig(
        defineAstroPaperConfig({
          site: {
            url: "https://example.com",
            title: "Example",
            description: "Minimal",
            author: "Author",
            googleVerification: "",
          },
        }),
        { PUBLIC_GOOGLE_SITE_VERIFICATION: "env-token" }
      ).site.googleVerification
    ).toBe("env-token");
  });

  it("resolves upstream defaults around the local site values", () => {
    const { config } = moduleExports;
    expect(config.site).toMatchObject({
      url: "https://frevia.site/",
      base: "/",
      title: "Frevia's Blog!",
      description: "一个时间长河中的个人档案馆。",
      author: "Frevia",
      profile: "https://frevia.site/",
      ogImage: "og.png",
      lang: "zh-CN",
      timezone: "Asia/Shanghai",
      dir: "ltr",
    });
    expect(config.posts).toEqual({
      perPage: 10,
      perIndex: 5,
      scheduledPostMargin: 15 * 60 * 1000,
    });
    expect(config.features).toMatchObject({
      lightAndDarkMode: true,
      dynamicOgImage: true,
      showArchives: true,
      showBackButton: true,
      search: "pagefind",
    });
  });

  it("keeps local-only extensions under config.local", () => {
    const { config } = moduleExports;
    expect(config.local).toEqual({
      content: {
        blogPath: "src/data/blog",
        diaryPath: "src/data/snippets",
        clipPath: "src/data/clip",
      },
      showCalendar: true,
      createdAt: "2025-03-17",
      feeds: {
        perIndex: 12,
        perPage: 12,
      },
      rss: {
        fetchDuringBuild: false,
      },
      comments: {
        enabled: true,
      },
      editPost: {
        text: "Edit page",
      },
    });
  });

  it("exports the legacy SITE shape used by current call sites", () => {
    const { config, SITE } = moduleExports;
    expect(SITE).toMatchObject({
      website: config.site.url,
      base: config.site.base,
      author: config.site.author,
      profile: config.site.profile,
      desc: config.site.description,
      title: config.site.title,
      cover: config.site.ogImage,
      postPerIndex: config.posts.perIndex,
      postPerPage: config.posts.perPage,
      showCalendar: config.local.showCalendar,
      feedsPerIndex: config.local.feeds.perIndex,
      feedsPerPage: config.local.feeds.perPage,
      comments: config.local.comments,
      rss: config.local.rss,
      search: config.features.search,
      googleVerification: config.site.googleVerification,
      socials: config.socials,
      shareLinks: config.shareLinks,
    });
    expect(SITE.editPost).toEqual({
      enabled: false,
      text: "Edit page",
      url: "https://github.com/frevia/obsidian-blog-data",
    });
  });

  it("exports legacy content path constants from local.content", () => {
    const { BLOG_PATH, CLIP_PATH, config, DIARY_PATH } = moduleExports;
    expect(BLOG_PATH).toBe(config.local.content.blogPath);
    expect(DIARY_PATH).toBe(config.local.content.diaryPath);
    expect(CLIP_PATH).toBe(config.local.content.clipPath);
  });
});
