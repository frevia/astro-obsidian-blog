/**
 * Vercel runtime 友好的 RSS 抓取实现。
 *
 * - 不读写本地磁盘（Serverless 上 `public/` 是只读、可写区是临时的）。
 * - 通过 Vite 的 `?raw` 把订阅列表编译进函数包，避免依赖 `process.cwd()`。
 * - 同步并发 + 单源超时，整体行为对齐 `scripts/fetch-rss-feeds.js`。
 */

import Parser from "rss-parser";
import subscriptionsRaw from "../../public/data/feeds/rss-subscriptions.json?raw";

export interface FeedSubscription {
  url: string;
  avatar?: string;
  name?: string;
}

export interface FeedItem {
  blog_name: string;
  title: string;
  published: string;
  link: string;
  avatar?: string;
}

export interface FeedsPayload {
  items: FeedItem[];
  updated: string;
}

const PER_FEED_TIMEOUT_MS = 10_000;
const CONCURRENCY = 5;

function loadSubscriptions(): FeedSubscription[] {
  try {
    const parsed = JSON.parse(subscriptionsRaw) as {
      subscriptions?: FeedSubscription[];
    };
    return parsed.subscriptions ?? [];
  } catch (err) {
    console.error("Failed to parse rss-subscriptions.json:", err);
    return [];
  }
}

function formatDate(dateString?: string | null): string {
  if (!dateString) return "未知";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "未知";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("fetch timeout")), ms);
    promise.then(
      v => {
        clearTimeout(timer);
        resolve(v);
      },
      e => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });
}

async function fetchOne(
  parser: Parser,
  sub: FeedSubscription
): Promise<FeedItem> {
  try {
    const feed = await withTimeout(parser.parseURL(sub.url), PER_FEED_TIMEOUT_MS);
    const latest = feed.items?.[0];
    return {
      blog_name: feed.title || sub.name || "未知博客",
      title: latest?.title ?? "",
      published: latest ? formatDate(latest.pubDate ?? latest.isoDate) : "",
      link: latest?.link ?? feed.link ?? sub.url,
      avatar: sub.avatar,
    };
  } catch (err) {
    console.error(`抓取 ${sub.url} 失败:`, err instanceof Error ? err.message : err);
    return {
      blog_name: sub.name || "未知博客",
      title: "",
      published: "",
      link: sub.url,
      avatar: sub.avatar,
    };
  }
}

function buildUpdatedLabel(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return `${y}年${m}月${d}日 ${hh}:${mm}:${ss}`;
}

export async function fetchAndBuildFeeds(): Promise<FeedsPayload> {
  const subscriptions = loadSubscriptions();
  if (subscriptions.length === 0) {
    return { items: [], updated: buildUpdatedLabel() };
  }

  const parser = new Parser({ timeout: PER_FEED_TIMEOUT_MS });
  const items: FeedItem[] = [];
  for (let i = 0; i < subscriptions.length; i += CONCURRENCY) {
    const batch = subscriptions.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(batch.map(s => fetchOne(parser, s)));
    items.push(...batchResults);
  }

  items.sort((a, b) => {
    if (!a.published || a.published === "未知") return 1;
    if (!b.published || b.published === "未知") return -1;
    const da = new Date(a.published).getTime();
    const db = new Date(b.published).getTime();
    if (Number.isNaN(da)) return 1;
    if (Number.isNaN(db)) return -1;
    return db - da;
  });

  return { items, updated: buildUpdatedLabel() };
}
