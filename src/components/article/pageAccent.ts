export type ArticleAccentKey =
  | "default"
  | "movie"
  | "tv"
  | "book"
  | "music"
  | "technical"
  | "reading"
  | "travel";

export interface ArticleAccent {
  key: ArticleAccentKey;
  accent: string;
  soft: string;
}

export interface ArticleAccentInput {
  /** Optional explicit card type, such as `book` or `music`. */
  cardType?: string | null;
  /** Optional article category, usually derived from the post id. */
  contentType?: string | null;
  /** Frontmatter tags used as a category fallback. */
  tags?: readonly string[] | null;
  /** Rendered source body, used to detect the first embedded media card. */
  body?: string | null;
}

const PALETTE: Record<ArticleAccentKey, ArticleAccent> = {
  default: { key: "default", accent: "#3d6b7f", soft: "#e8f1f5" },
  movie: { key: "movie", accent: "#be123c", soft: "#fff1f2" },
  tv: { key: "tv", accent: "#7c3aed", soft: "#f5f3ff" },
  book: { key: "book", accent: "#92400e", soft: "#fffbeb" },
  music: { key: "music", accent: "#0f766e", soft: "#f0fdfa" },
  technical: { key: "technical", accent: "#2563eb", soft: "#eff6ff" },
  reading: { key: "reading", accent: "#a16207", soft: "#fefce8" },
  travel: { key: "travel", accent: "#0f766e", soft: "#ecfdf5" },
};

const CARD_TYPES = new Set<ArticleAccentKey>(["movie", "tv", "book", "music"]);

const CATEGORY_ALIASES: Record<string, ArticleAccentKey> = {
  tech: "technical",
  technical: "technical",
  技术: "technical",
  engineering: "technical",
  read: "reading",
  reading: "reading",
  阅读: "reading",
  book: "reading",
  travel: "travel",
  旅行: "travel",
  游记: "travel",
};

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

function firstEmbeddedCardType(body?: string | null): ArticleAccentKey | null {
  if (!body) return null;
  const match = body.match(/(?:^|\n)\s*```card-(movie|tv|book|music)\b/i);
  const key = match?.[1]?.toLowerCase() as ArticleAccentKey | undefined;
  return key && CARD_TYPES.has(key) ? key : null;
}

function resolveCardType(input: ArticleAccentInput): ArticleAccentKey | null {
  for (const candidate of [input.cardType, firstEmbeddedCardType(input.body)]) {
    const key = candidate ? normalize(candidate) : "";
    if (CARD_TYPES.has(key as ArticleAccentKey)) {
      return key as ArticleAccentKey;
    }
  }
  return null;
}

function resolveCategory(input: ArticleAccentInput): ArticleAccentKey | null {
  const candidates = [input.contentType, ...(input.tags ?? [])];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const key = CATEGORY_ALIASES[normalize(candidate)];
    if (key) return key;
  }
  return null;
}

export function getArticleAccent(
  input: ArticleAccentInput = {}
): ArticleAccent {
  const key = resolveCardType(input) ?? resolveCategory(input) ?? "default";
  return PALETTE[key];
}

export function getArticleAccentStyle(input: ArticleAccentInput = {}): string {
  const { accent, soft } = getArticleAccent(input);
  return `--page-accent:${accent};--page-accent-soft:${soft};`;
}
