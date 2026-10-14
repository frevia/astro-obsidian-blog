import { getCollection } from "astro:content";
import { countContentWords } from "./countContentWords";
import postFilter from "./postFilter";
import { SITE } from "@/config";
import { parseYMDAsUTC, toSiteYMD } from "@/utils/calendarDate";

export interface BlogMetrics {
  runningDays: number;
  totalPosts: number;
  blogPosts: number;
  diaryPosts: number;
  totalWords: number;
  totalWordsInWan: string;
}

export async function getBlogMetrics(): Promise<BlogMetrics> {
  // 博客创建日期：从配置中获取
  const startDate = parseYMDAsUTC(SITE.createdAt);
  const currentDate = parseYMDAsUTC(toSiteYMD(new Date()));

  const timeDiff = currentDate.getTime() - startDate.getTime();
  const runningDays = Math.floor(timeDiff / (1000 * 3600 * 24));

  const blogPosts = await getCollection("blog", postFilter);
  const diaryPosts = await getCollection("diary");
  const totalPosts = blogPosts.length + diaryPosts.length;

  const wordCounts = await Promise.all(
    [...blogPosts, ...diaryPosts].map(entry =>
      countContentWords(entry.body ?? "")
    )
  );
  const totalWords = wordCounts.reduce((sum, count) => sum + count, 0);

  const totalWordsInWan = (totalWords / 10000).toFixed(1);

  return {
    runningDays,
    totalPosts,
    blogPosts: blogPosts.length,
    diaryPosts: diaryPosts.length,
    totalWords,
    totalWordsInWan,
  };
}
