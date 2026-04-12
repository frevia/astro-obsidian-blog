import type { APIRoute } from "astro";
import { execSync } from "child_process";
import { SITE } from "@/config";

export const GET: APIRoute = () => {
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

    return new Response(
      JSON.stringify({
        success: true,
        message: "RSS data fetched successfully",
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
