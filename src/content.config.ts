import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import { SITE, BLOG_PATH, DIARY_PATH } from "@/config";

const blog = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: `./${BLOG_PATH}` }),
  schema: ({ image }) =>
    z.object({
      author: z.string().default(SITE.author),
      pubDatetime: z.date(),
      modDatetime: z.date().optional().nullable(),
      title: z.string(),
      featured: z.boolean().optional(),
      draft: z.boolean().optional(),
      tags: z.array(z.string()).default(["其他"]),
      // 分类，前端用于生成分类页面
      categories: z.array(z.string()).default([]),
      // 是否显示目录（tocbot 生成的目录）
      toc: z.boolean().default(true),
      ogImage: image().or(z.string()).optional(),
      description: z.string(),
      canonicalURL: z.string().optional(),
      hideEditPost: z.boolean().optional(),
      timezone: z.string().optional(),
      summary: z.string().optional(),
      keywords: z.array(z.string()).optional(),
      mainPoints: z.array(z.string()).optional(),
      series: z.string().optional().nullable(),
    }),
});

const diary = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: `./${DIARY_PATH}` }),
  schema: z.object({
    tags: z.array(z.string()).default(["Diary"]),
    draft: z.boolean().optional(),
  }),
});

export const collections = { blog, diary };
