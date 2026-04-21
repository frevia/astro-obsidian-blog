import type { APIRoute } from "astro";
import { execSync } from "child_process";
import fs from "node:fs";
import path from "node:path";
import { SITE } from "@/config";
import { FEEDS_BLOB_PATHNAME } from "@/utils/feedsBlobPathname";

export const GET: APIRoute = async () => {
  // 检查是否为构建环境
  const isBuildProcess =
    process.env.NODE_ENV === "production" &&
    (process.env.ASTRO_BUILD ||
      import.meta.env?.ASTRO_BUILD ||
      process.argv.includes("build") ||
      process.argv.some(arg => arg.includes("astro") && arg.includes("build")));

  // 如果是构建环境，根据配置决定是否执行 RSS 抓取
  if (isBuildProcess) {
    if (SITE.rss.fetchDuringBuild) {
      console.log("📡 RSS fetching enabled during build process");
    } else {
      console.log("🚫 RSS fetching disabled during build process (config)");
      return new Response(
        JSON.stringify({
          success: false,
          message: "RSS fetching disabled during build process (config)",
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }
  }

  try {
    // 执行RSS数据抓取脚本
    execSync("node scripts/fetch-rss-feeds.js", { stdio: "inherit" });

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    const feedsPath = path.join(
      process.cwd(),
      "public",
      "data",
      "feeds",
      "feeds.json"
    );
    if (token && fs.existsSync(feedsPath)) {
      const { put } = await import("@vercel/blob");
      const body = fs.readFileSync(feedsPath);
      await put(FEEDS_BLOB_PATHNAME, body, {
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "application/json",
        token,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: token
          ? "RSS data fetched and synced to Blob"
          : "RSS data fetched successfully",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching RSS data:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Failed to fetch RSS data",
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
};
