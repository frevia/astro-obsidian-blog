import type { APIRoute } from "astro";
import { FEEDS_BLOB_PATHNAME } from "@/utils/feedsBlobPathname";
import { fetchAndBuildFeeds } from "@/utils/fetchFeeds";

export const prerender = false;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

/**
 * Vercel Cron 调用入口。
 * 必须以 Serverless Function 形式部署（prerender=false）。
 *
 * 鉴权：若设置了 CRON_SECRET，则要求请求头 `Authorization: Bearer <secret>`，
 * 这正是 Vercel Cron 默认行为。未设置时不校验，方便本地/手动调用。
 */
export const GET: APIRoute = async ({ request }) => {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return json(401, { success: false, message: "Unauthorized" });
    }
  }

  try {
    const feeds = await fetchAndBuildFeeds();
    const body = JSON.stringify(feeds, null, 2);

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      return json(500, {
        success: false,
        message:
          "BLOB_READ_WRITE_TOKEN is not configured; cannot persist feeds.",
        itemCount: feeds.items.length,
      });
    }

    const { put } = await import("@vercel/blob");
    await put(FEEDS_BLOB_PATHNAME, body, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      token,
    });

    return json(200, {
      success: true,
      message: "RSS data fetched and synced to Blob",
      itemCount: feeds.items.length,
      updated: feeds.updated,
    });
  } catch (error) {
    console.error("Error fetching RSS data:", error);
    return json(500, {
      success: false,
      message: "Failed to fetch RSS data",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
