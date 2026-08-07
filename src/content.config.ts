import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";
import { SITE, BLOG_PATH, DIARY_PATH, WIKI_PATH } from "@/config";

const normalizeAuthor = (
  author?: string | string[] | null,
  authors?: string | string[] | null
) => {
  const pick = (value?: string | string[] | null) => {
    if (Array.isArray(value)) return value.find(Boolean)?.trim();
    if (typeof value === "string") return value.trim();
    return "";
  };
  return pick(author) || pick(authors) || SITE.author;
};

const parsePublishedDate = (value: unknown) => {
  if (value instanceof Date) return value;
  if (typeof value !== "string") return value;
  const raw = value.trim();
  if (!raw) return value;

  // Support common frontmatter datetime formats like:
  // 2024-01-28 19:12, 2024-01-28 19:12:00, 2024/01/28 19:12
  const dateTime = raw.match(
    /^(\d{4})[-/](\d{2})[-/](\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/
  );
  if (dateTime) {
    const [, y, m, d, hh, mm, ss = "00"] = dateTime;
    const parsed = new Date(
      Number(y),
      Number(m) - 1,
      Number(d),
      Number(hh),
      Number(mm),
      Number(ss)
    );
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  const ymd = raw.match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/);
  if (ymd) {
    const [, year, month, day] = ymd;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day));
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  const ym = raw.match(/^(\d{4})-(\d{2})$/);
  if (ym) {
    const year = Number(ym[1]);
    const month = Number(ym[2]);
    return new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  }

  // Keep default Date parsing as a fallback for ISO-like values.
  const fallback = new Date(raw);
  if (!Number.isNaN(fallback.getTime())) return fallback;

  return value;
};

const blog = defineCollection({
  loader: glob({
    pattern: "**/[^_]*.{md,mdx}",
    base: `./${BLOG_PATH}`,
    // Astro 7.1 defers expensive markdown rendering until a page actually
    // calls render(), keeping collection sync light for archive/index routes.
    deferRender: true,
  }),
  schema: ({ image }) =>
    z
      .object({
        author: z
          .union([z.string(), z.array(z.string())])
          .nullable()
          .optional(),
        authors: z
          .union([z.string(), z.array(z.string())])
          .nullable()
          .optional(),
        published: z.preprocess(parsePublishedDate, z.date()),
        title: z.string(),
        tags: z.array(z.string()).default(["其他"]),
        cover: image().or(z.string()).optional(),
        description: z.string(),
        canonicalURL: z.string().optional(),
        hideEditPost: z.boolean().optional(),
        timezone: z.string().optional(),
        summary: z.string().optional(),
        keywords: z.array(z.string()).optional(),
        mainPoints: z.array(z.string()).optional(),
        locations: z.array(z.string()).optional(),
      })
      .transform(data => ({
        ...data,
        author: normalizeAuthor(data.author, data.authors),
      })),
});

const diary = defineCollection({
  loader: glob({
    pattern: "**/[^_]*.{md,mdx}",
    base: `./${DIARY_PATH}`,
    deferRender: true,
  }),
  schema: z.object({
    tags: z.array(z.string()).default(["Diary"]),
  }),
});

/**
 * Public projection of the private knowledge wiki.
 *
 * The exporter deliberately copies only an explicit allowlist into this
 * directory. Keep the schema permissive for the source shape: wiki pages have
 * `sources[]` frontmatter but intentionally do not need blog-only fields such
 * as `published` or `description`.
 */
const wiki = defineCollection({
  loader: glob({
    pattern: "**/[^_]*.md",
    base: `./${WIKI_PATH}`,
    deferRender: true,
  }),
  schema: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    summary: z.string().optional(),
    sources: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
  }),
});

export const collections = { blog, diary, wiki };
