export const BLOG_PATH = "src/data/blog";
export const DIARY_PATH = "src/data/diary";

export const SITE = {
  website: "https://frevia.site/", // replace this with your deployed domain
  author: "Frevia",
  profile: "https://frevia.site/",
  desc: "一个时间长河中的个人档案馆。",
  title: "Frevia's Blog!",
  ogImage: "og.jpg",
  lightAndDarkMode: true,
  postPerIndex: 5,
  postPerPage: 10,
  scheduledPostMargin: 15 * 60 * 1000, // 15 minutes
  showArchives: true,
  showBackButton: true, // show back button in post detail
  editPost: {
    enabled: false,
    text: "Edit page",
    url: "https://github.com/0xfinn/obsidian-blog-data",
  },
  comments: {
    enabled: true, // 启用评论功能
  },
  dynamicOgImage: false,
  // 分类排序设置（仅在手动模式下使用）
  categoryOrder: {
    manual: false,
    order: [] as const,
  },
  dir: "ltr", // "rtl" | "auto"
  lang: "zh-CN", // html lang code. Set this empty and default will be "en"
  timezone: "Asia/Shanghai", // Default global timezone (IANA format) https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
} as const;
