import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import { SITE, BLOG_PATH, DIARY_PATH } from "@/config";

const blog = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: `./${BLOG_PATH}` }),
  schema: ({ image }) =>
    z
      .object({
        author: z.string().default(SITE.author),
        published: z.date().optional(),
        pubDatetime: z.date().optional(),
        updated: z.date().optional().nullable(),
        modDatetime: z.date().optional().nullable(),
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
      .refine(data => Boolean(data.published || data.pubDatetime), {
        path: ["published"],
        message: "published is required",
      })
      .transform(data => ({
        ...data,
        published: data.published ?? data.pubDatetime!,
        updated: data.updated ?? data.modDatetime ?? null,
      })),
});

const diary = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: `./${DIARY_PATH}` }),
  schema: z.object({
    tags: z.array(z.string()).default(["Diary"]),
  }),
});

export const collections = { blog, diary };
