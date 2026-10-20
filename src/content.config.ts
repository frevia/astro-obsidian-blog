import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";
import { SITE, BLOG_PATH, DIARY_PATH, WIKI_PATH } from "@/config";
import { normalizeEventFields, parsePublishedDate } from "@/utils/contentDates";

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

const blog = defineCollection({
  loader: glob({
    pattern: "**/[^_]*.{md,mdx}",
    base: `./${BLOG_PATH}`,
    // Astro 7.1 defers expensive markdown rendering until a page actually
    // calls render(), keeping collection sync light for archive/index routes.
    deferRender: true,
  }),
  schema: ({ image }) =>
    z.preprocess(
      input => {
        if (!input || typeof input !== "object") return input;
        const data = input as Record<string, unknown>;
        return {
          ...data,
          published: parsePublishedDate(
            data.published,
            typeof data.timezone === "string" ? data.timezone : undefined
          ),
        };
      },
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
          published: z.date(),
          eventDate: z.unknown().optional(),
          eventEndDate: z.unknown().optional(),
          title: z.string(),
          pageLayout: z.enum(["journal"]).optional(),
          album: z.boolean().default(false),
          tags: z.array(z.string()).default(["其他"]),
          cover: image().or(z.string()).optional(),
          description: z.string(),
          canonicalURL: z.string().optional(),
          hideEditPost: z.boolean().optional(),
          timezone: z
            .string()
            .optional()
            .refine(value => {
              if (!value) return true;
              try {
                new Intl.DateTimeFormat("en", { timeZone: value });
                return true;
              } catch {
                return false;
              }
            }, "timezone 必须是有效的 IANA 时区"),
          summary: z.string().optional(),
          keywords: z.array(z.string()).optional(),
          mainPoints: z.array(z.string()).optional(),
          locations: z.array(z.string()).optional(),
        })
        .superRefine((data, ctx) => {
          try {
            normalizeEventFields(data);
          } catch (error) {
            const message =
              error instanceof Error ? error.message : String(error);
            ctx.addIssue({
              code: "custom",
              message,
              path: [
                message.startsWith("eventEndDate")
                  ? "eventEndDate"
                  : "eventDate",
              ],
            });
          }
        })
        .transform(({ eventDate, eventEndDate, ...data }) => ({
          ...data,
          ...normalizeEventFields({ eventDate, eventEndDate }),
          author: normalizeAuthor(data.author, data.authors),
        }))
    ),
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
