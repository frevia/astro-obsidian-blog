import type { APIRoute } from "astro";
import { FEEDS_BLOB_PATHNAME } from "@/utils/feedsBlobPathname";

const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "public, s-maxage=120, stale-while-revalidate=3600",
};

/**
 * 邻居页数据源。生产环境 Cron 写入的是 Serverless 临时磁盘，不会更新 CDN 上的
 * `/data/feeds/feeds.json`；若配置了 BLOB_READ_WRITE_TOKEN，Cron 会把结果同步到
 * Blob，本接口优先读 Blob，否则回退到构建时静态文件。
 */
export const GET: APIRoute = async ({ request }) => {
  const origin = new URL(request.url).origin;
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (token) {
    try {
      const { head } = await import("@vercel/blob");
      const meta = await head(FEEDS_BLOB_PATHNAME, { token });
      const blobRes = await fetch(meta.url);
      if (blobRes.ok) {
        return new Response(await blobRes.text(), { headers: jsonHeaders });
      }
    } catch {
      // Blob 未上传或 head 失败：使用静态回退
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
