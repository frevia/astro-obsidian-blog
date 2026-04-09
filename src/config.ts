export const BLOG_PATH = "src/data/blog";
export const DIARY_PATH = "src/data/diary";

export const SITE = {
  website: "https://frevia.site/", // replace this with your deployed domain
  author: "Frevia",
  profile: "https://frevia.site/",
  desc: "一个时间长河中的个人档案馆。",
  title: "Frevia's Blog!",
  cover: "og.jpg",
  lightAndDarkMode: true,
  postPerIndex: 5,
  postPerPage: 10,
  scheduledPostMargin: 15 * 60 * 1000, // 15 minutes
  showArchives: true,
  showBackButton: true, // show back button in post detail
  /** 是否在顶部菜单显示日历 */
  showCalendar: true,
  editPost: {
    enabled: false,
    text: "Edit page",
    url: "https://github.com/frevia/obsidian-blog-data",
  },
  comments: {
    enabled: true, // 启用评论功能
  },
  dynamicOgImage: false,
  dir: "ltr", // "rtl" | "auto"
  lang: "zh-CN", // html lang code. Set this empty and default will be "en"
  timezone: "Asia/Shanghai", // Default global timezone (IANA format) https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
  // 博客创建日期（用于计算运行天数）
  createdAt: "2025-03-17",
  // 邻居 feeds 配置
  feedsPerIndex: 12,
  feedsPerPage: 12,
} as const;
