/**
 * Internal resolved configuration used throughout the codebase.
 *
 * Prefer editing `astro-paper.config.ts` instead of this file. This module exists to
 * apply defaults and expose both the new resolved config shape and the legacy
 * SITE/content constants still used by current call sites.
 */
import userConfig from "@/astro-paper.config";
import type {
  AstroPaperConfig,
  EditPostConfig,
  ResolvedAstroPaperConfig,
  ResolvedEditPostConfig,
} from "./types/config";

const DEFAULT_OG_IMAGE = "";
const DEFAULT_EDIT_POST_TEXT = "Edit page";

const normalizeEditPost = (
  editPost: EditPostConfig | undefined
): ResolvedEditPostConfig => ({
  enabled: editPost?.enabled ?? false,
  url: editPost?.url ?? "",
});

export interface AstroPaperConfigEnv {
  PUBLIC_GOOGLE_SITE_VERIFICATION?: string;
}

export function resolveAstroPaperConfig(
  input: AstroPaperConfig,
  env: AstroPaperConfigEnv = {}
): ResolvedAstroPaperConfig {
  return {
    site: {
      ...input.site,
      base: input.site.base ?? "/",
      ogImage: input.site.ogImage ?? DEFAULT_OG_IMAGE,
      lang: input.site.lang ?? "en",
      timezone: input.site.timezone ?? "UTC",
      dir: input.site.dir ?? "ltr",
      googleVerification:
        input.site.googleVerification || env.PUBLIC_GOOGLE_SITE_VERIFICATION,
    },
    posts: {
      perPage: input.posts?.perPage ?? 4,
      perIndex: input.posts?.perIndex ?? 4,
      scheduledPostMargin: input.posts?.scheduledPostMargin ?? 15 * 60 * 1000,
    },
    features: {
      lightAndDarkMode: input.features?.lightAndDarkMode ?? true,
      dynamicOgImage: input.features?.dynamicOgImage ?? true,
      showArchives: input.features?.showArchives ?? true,
      showBackButton: input.features?.showBackButton ?? true,
      editPost: normalizeEditPost(input.features?.editPost),
      search: input.features?.search ?? "pagefind",
    },
    socials: input.socials ?? [],
    shareLinks: input.shareLinks ?? [],
    local: {
      content: {
        blogPath: input.local?.content?.blogPath ?? "src/content/posts",
        diaryPath: input.local?.content?.diaryPath ?? "src/content/diary",
        clipPath: input.local?.content?.clipPath ?? "src/content/clip",
      },
      showCalendar: input.local?.showCalendar ?? false,
      createdAt: input.local?.createdAt ?? "1970-01-01",
      feeds: {
        perIndex: input.local?.feeds?.perIndex ?? 12,
        perPage: input.local?.feeds?.perPage ?? 12,
      },
      rss: {
        fetchDuringBuild: input.local?.rss?.fetchDuringBuild ?? false,
      },
      comments: {
        enabled: input.local?.comments?.enabled ?? false,
      },
      editPost: {
        text: input.local?.editPost?.text ?? DEFAULT_EDIT_POST_TEXT,
      },
    },
  };
}

function readAstroPaperConfigEnv(): AstroPaperConfigEnv {
  const env = import.meta.env as unknown as AstroPaperConfigEnv;
  return {
    PUBLIC_GOOGLE_SITE_VERIFICATION: env.PUBLIC_GOOGLE_SITE_VERIFICATION,
  };
}

export const config = resolveAstroPaperConfig(
  userConfig,
  readAstroPaperConfigEnv()
);

export default config;

export const BLOG_PATH = config.local.content.blogPath;
export const DIARY_PATH = config.local.content.diaryPath;
export const CLIP_PATH = config.local.content.clipPath;

export const SITE = {
  website: config.site.url,
  base: config.site.base,
  author: config.site.author,
  profile: config.site.profile,
  desc: config.site.description,
  title: config.site.title,
  cover: config.site.ogImage,
  lightAndDarkMode: config.features.lightAndDarkMode,
  postPerIndex: config.posts.perIndex,
  postPerPage: config.posts.perPage,
  scheduledPostMargin: config.posts.scheduledPostMargin,
  showArchives: config.features.showArchives,
  showBackButton: config.features.showBackButton,
  showCalendar: config.local.showCalendar,
  editPost: {
    enabled: config.features.editPost.enabled,
    text: config.local.editPost.text,
    url: config.features.editPost.url,
  },
  comments: config.local.comments,
  dynamicOgImage: config.features.dynamicOgImage,
  dir: config.site.dir,
  lang: config.site.lang,
  timezone: config.site.timezone,
  createdAt: config.local.createdAt,
  feedsPerIndex: config.local.feeds.perIndex,
  feedsPerPage: config.local.feeds.perPage,
  rss: config.local.rss,
} as const;
