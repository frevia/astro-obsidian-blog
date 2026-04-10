import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import { SITE, BLOG_PATH, DIARY_PATH, CLIP_PATH } from "@/config";

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

  const ym = raw.match(/^(\d{4})-(\d{2})$/);
  if (ym) {
    const year = Number(ym[1]);
    const month = Number(ym[2]);
    return new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  }
  return value;
};

const blog = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: `./${BLOG_PATH}` }),
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
        updated: z.date().optional().nullable(),
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
        updated: data.updated ?? null,
      })),
});

const diary = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: `./${DIARY_PATH}` }),
  schema: z.object({
    tags: z.array(z.string()).default(["Diary"]),
  }),
});

const clip = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: `./${CLIP_PATH}` }),
  schema: () =>
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
        updated: z.date().optional().nullable(),
        title: z.string(),
        tags: z
          .array(z.string())
          .nullable()
          .optional()
          .transform(value => value ?? []),
        cover: z.string().optional(),
        description: z
          .string()
          .nullable()
          .optional()
          .transform(value => value ?? ""),
        source: z.string().optional(),
        canonicalURL: z.string().optional(),
        timezone: z.string().optional(),
        slug: z.string().optional(),
      })
      .transform(data => ({
        ...data,
        author: normalizeAuthor(data.author, data.authors),
        updated: data.updated ?? null,
      })),
});

export const collections = { blog, diary, clip };
