/** Vercel Blob pathname for cron-updated feeds JSON (must match fetch-rss upload). */
export const FEEDS_BLOB_PATHNAME = "obsidian-blog-feeds.json";

export type FeedsBlobAccess = "public" | "private";

/**
 * Must match the Blob store type in Vercel (private store → `private`).
 * Set `BLOB_STORE_ACCESS=public` only if the store is configured for public blobs.
 */
export function feedsBlobAccess(): FeedsBlobAccess {
  const v = process.env.BLOB_STORE_ACCESS?.trim().toLowerCase();
  return v === "public" ? "public" : "private";
}
