import { defineAstroPaperConfig } from "./src/types/config";

export default defineAstroPaperConfig({
  site: {
    url: "https://www.frevia.me/",
    title: "Frevia's Blog!",
    description: "记录日常、技术、阅读和路上的见闻。",
    author: "Frevia",
    profile: "https://www.frevia.me/",
    ogImage: "og.png",
    lang: "zh-CN",
    timezone: "Asia/Shanghai",
    dir: "ltr",
  },
  posts: {
    perPage: 10,
    perIndex: 5,
    scheduledPostMargin: 15 * 60 * 1000,
  },
  features: {
    lightAndDarkMode: true,
    dynamicOgImage: true,
    showArchives: true,
    showBackButton: true,
    editPost: {
      enabled: false,
      url: "https://github.com/frevia/obsidian-blog-data",
    },
    search: "pagefind",
    viewTransitions: "client-router",
  },
  socials: [
    {
      name: "GitHub",
      url: "https://github.com/frevia",
      linkTitle: "Frevia's Blog! on GitHub",
    },
  ],
  shareLinks: [],
  local: {
    content: {
      blogPath: "src/data/blog",
      diaryPath: "src/data/notes",
      wikiPath: "src/data/wiki",
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
  },
});
