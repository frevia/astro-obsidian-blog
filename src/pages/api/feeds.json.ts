import type { APIRoute } from "astro";
import { FEEDS_BLOB_PATHNAME, feedsBlobAccess } from "@/utils/feedsBlobPathname";

export const prerender = false;

const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "public, s-maxage=120, stale-while-revalidate=3600",
};

/**
 * 邻居页数据源。
 * 生产环境 Cron 写入的是 Serverless 临时磁盘，不会更新 CDN 上的
 * `/data/feeds/feeds.json`；若配置了 BLOB_READ_WRITE_TOKEN，Cron 会把结果同步到
 * Vercel Blob，本接口优先读 Blob，否则回退到构建时打包进来的静态文件。
 */
export const GET: APIRoute = async ({ request }) => {
  const origin = new URL(request.url).origin;
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (token) {
    try {
      const access = feedsBlobAccess();
      const { get } = await import("@vercel/blob");
      const blobRes = await get(FEEDS_BLOB_PATHNAME, {
        token,
        access,
        useCache: access === "private" ? false : undefined,
      });
      if (
        blobRes?.statusCode === 200 &&
        blobRes.stream != null
      ) {
        const text = await new Response(blobRes.stream).text();
        return new Response(text, { headers: jsonHeaders });
      }
    } catch (err) {
      console.warn(
        "Read feeds from Blob failed, fallback to static:",
        err instanceof Error ? err.message : err
      );
    }
  }

  const staticRes = await fetch(`${origin}/data/feeds/feeds.json`);
  if (!staticRes.ok) {
    return new Response(
      JSON.stringify({
        items: [],
        error: "feeds_unavailable",
        detail: staticRes.status,
      }),
      { status: 502, headers: jsonHeaders }
    );
  }

  return new Response(await staticRes.text(), { headers: jsonHeaders });
};
