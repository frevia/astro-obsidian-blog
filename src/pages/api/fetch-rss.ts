import type { APIRoute } from 'astro';
import { execSync } from 'child_process';

export const GET: APIRoute = () => {
  try {
    // 执行RSS数据抓取脚本
    execSync('node scripts/fetch-rss-feeds.js', { stdio: 'inherit' });
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'RSS data fetched successfully',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching RSS data:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Failed to fetch RSS data',
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};
