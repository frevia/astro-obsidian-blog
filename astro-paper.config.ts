import { defineAstroPaperConfig } from "./src/types/config";

export default defineAstroPaperConfig({
  site: {
    url: "https://frevia.site/",
    title: "Frevia's Blog!",
    description: "一个时间长河中的个人档案馆。",
    author: "Frevia",
    profile: "https://frevia.site/",
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
    viewTransitions: "native",
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
  },
});
