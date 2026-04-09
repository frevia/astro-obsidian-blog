import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import { SITE, BLOG_PATH, DIARY_PATH, CLIP_PATH } from "@/config";

const blog = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: `./${BLOG_PATH}` }),
  schema: ({ image }) =>
    z
      .object({
        author: z.string().default(SITE.author),
        published: z.date(),
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
    z.object({
      author: z
        .union([z.string(), z.array(z.string())])
        .nullable()
        .optional()
        .transform(value => {
          if (Array.isArray(value)) return value[0] ?? SITE.author;
          return value ?? SITE.author;
        }),
      published: z.date(),
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
    }),
});

export const collections = { blog, diary, clip };
