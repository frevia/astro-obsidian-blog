export interface SiteConfig {
  /** Deployed URL of the site, e.g. "https://example.com" */
  url: string;
  /** Astro base pathname. Defaults to "/". */
  base?: string;
  /** Blog title shown in header and meta tags */
  title: string;
  /** Short description used in SEO meta and RSS feed */
  description: string;
  /** Default post author name */
  author: string;
  /** Author profile URL (used in structured data) */
  profile?: string;
  /** Fallback OG image filename in /public, e.g. "og.jpg" */
  ogImage?: string;
  /** HTML lang attribute, defaults to "en" */
  lang?: string;
  /** IANA timezone for post dates, e.g. "Asia/Bangkok" */
  timezone?: string;
  /** Text direction */
  dir?: "ltr" | "rtl" | "auto";
  /** Google Search Console verification meta tag value */
  googleVerification?: string;
}

export interface PostsConfig {
  /** Posts per page on paginated listing pages */
  perPage?: number;
  /** Posts shown on the index/home page */
  perIndex?: number;
  /**
   * Scheduled posts within this window (ms) of their pubDatetime
   * are shown as published. Defaults to 15 minutes.
   */
  scheduledPostMargin?: number;
}

export type EditPostConfig =
  | {
      enabled: true;
      /** Base URL for the edit link, e.g. GitHub edit URL */
      url: string;
    }
  | {
      enabled: false;
      /** Kept optional so existing disabled local configs can keep their URL. */
      url?: string;
    };

export interface ResolvedEditPostConfig {
  enabled: boolean;
  /** Base URL for the edit link, e.g. GitHub edit URL */
  url: string;
}

export interface FeaturesConfig {
  /** Enable light/dark mode toggle. Defaults to true. */
  lightAndDarkMode?: boolean;
  /**
   * Generate dynamic OG images per post and provide `/og.png` when the static
   * `public/{site.ogImage}` file is absent.
   */
  dynamicOgImage?: boolean;
  /** Show the /archives page and link it in nav. Defaults to true. */
  showArchives?: boolean;
  /** Show back button on post detail pages. Defaults to true. */
  showBackButton?: boolean;
  /** "Edit page" link shown on post detail pages. */
  editPost?: EditPostConfig;
  /**
   * Search provider. "pagefind" ships in the base template.
   * Set to false to disable search entirely.
   */
  search?: "pagefind" | false;
}

export interface SocialLink {
  /**
   * Must match an SVG filename in src/assets/icons/socials/.
   * e.g. "github" -> src/assets/icons/socials/github.svg
   */
  name: string;
  url: string;
  /**
   * Accessible label for the icon link (aria-label, title attribute).
   * Auto-generated if omitted.
   */
  linkTitle?: string;
}

export interface ShareLink {
  /**
   * Must match an SVG filename in src/assets/icons/socials/.
   * e.g. "facebook" -> src/assets/icons/socials/facebook.svg
   */
  name: string;
  /** Base share URL. The post URL will be appended as a query param. */
  url: string;
  /**
   * Accessible label for the icon link (aria-label, title attribute).
   * Auto-generated if omitted.
   */
  linkTitle?: string;
}

export interface LocalContentConfig {
  blogPath?: string;
  diaryPath?: string;
  clipPath?: string;
}

export interface LocalFeedsConfig {
  perIndex?: number;
  perPage?: number;
}

export interface LocalRssConfig {
  fetchDuringBuild?: boolean;
}

export interface LocalCommentsConfig {
  enabled?: boolean;
}

export interface LocalEditPostConfig {
  /** Legacy SITE.editPost.text label. */
  text?: string;
}

export interface LocalConfig {
  content?: LocalContentConfig;
  /** Whether to show the calendar affordance in local UI. */
  showCalendar?: boolean;
  /** Blog creation date used by running-day metrics. */
  createdAt?: string;
  /** Neighbor feeds pagination settings. */
  feeds?: LocalFeedsConfig;
  /** Local RSS ingestion behavior. */
  rss?: LocalRssConfig;
  /** Local comment provider toggle. */
  comments?: LocalCommentsConfig;
  /** Local-only edit post fields not present in upstream config. */
  editPost?: LocalEditPostConfig;
}

export interface AstroPaperConfig {
  site: SiteConfig;
  posts?: PostsConfig;
  features?: FeaturesConfig;
  /** Social profile links shown in header/footer */
  socials?: SocialLink[];
  /** Share links shown on post detail pages */
  shareLinks?: ShareLink[];
  /** Local extensions for this site. */
  local?: LocalConfig;
}

type ResolvedSiteConfig = Required<
  Pick<
    SiteConfig,
    | "url"
    | "base"
    | "title"
    | "description"
    | "author"
    | "lang"
    | "timezone"
    | "dir"
    | "ogImage"
  >
> &
  Pick<SiteConfig, "profile" | "googleVerification">;

export interface ResolvedFeaturesConfig {
  lightAndDarkMode: boolean;
  dynamicOgImage: boolean;
  showArchives: boolean;
  showBackButton: boolean;
  editPost: ResolvedEditPostConfig;
  search: "pagefind" | false;
}

export interface ResolvedLocalConfig {
  content: Required<LocalContentConfig>;
  showCalendar: boolean;
  createdAt: string;
  feeds: Required<LocalFeedsConfig>;
  rss: Required<LocalRssConfig>;
  comments: Required<LocalCommentsConfig>;
  editPost: Required<LocalEditPostConfig>;
}

export interface ResolvedAstroPaperConfig {
  site: ResolvedSiteConfig;
  posts: Required<PostsConfig>;
  features: ResolvedFeaturesConfig;
  socials: SocialLink[];
  shareLinks: ShareLink[];
  local: ResolvedLocalConfig;
}

/**
 * Type helper for astro-paper.config.ts.
 * Provides full IntelliSense without runtime overhead beyond returning input.
 */
export function defineAstroPaperConfig(
  config: AstroPaperConfig
): AstroPaperConfig {
  return config;
}
