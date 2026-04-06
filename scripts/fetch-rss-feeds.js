#!/usr/bin/env node

/**
 * 从 RSS 订阅源抓取数据并生成 feeds.json
 * 
 * 功能：
 * 1. 读取 RSS 订阅列表
 * 2. 从每个订阅源拉取最新文章
 * 3. 生成包含博客名、最新文章标题、发布时间、链接、头像的 feeds.json
 * 
 * 用法：
 * - 手动执行：node scripts/fetch-rss-feeds.js
 * - 构建后自动执行：通过 package.json 配置
 */

import fs from 'fs';
import path from 'path';
import Parser from 'rss-parser';

// 配置
const CONFIG = {
  // RSS 订阅列表路径
  subscriptionsPath: path.join(process.cwd(), 'public', 'data', 'feeds', 'rss-subscriptions.json'),
  // 输出路径
  outputPath: path.join(process.cwd(), 'public', 'data', 'feeds', 'feeds.json'),
  // 超时时间（毫秒）
  timeout: 10000,
  // 并发请求数
  concurrency: 5,
};

// 创建 Parser 实例
const parser = new Parser({
  timeout: CONFIG.timeout,
});

/**
 * 读取 RSS 订阅列表
 */
function readSubscriptions() {
  try {
    const data = fs.readFileSync(CONFIG.subscriptionsPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('读取订阅列表失败:', error.message);
    return { subscriptions: [] };
  }
}

/**
 * 从 RSS 源抓取数据
 */
async function fetchRssFeed(subscription) {
  try {
    console.log(`正在抓取: ${subscription.url}`);
    
    // 添加超时处理
    const feed = await Promise.race([
      parser.parseURL(subscription.url),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('抓取超时')), CONFIG.timeout);
      })
    ]);
    
    // 获取最新的文章
    const latestItem = feed.items && feed.items.length > 0 ? feed.items[0] : null;
    
    return {
      blog_name: feed.title || subscription.name || '未知博客',
      title: latestItem ? latestItem.title : '',
      published: latestItem ? formatDate(latestItem.pubDate) : '',
      link: latestItem ? latestItem.link : (feed.link || subscription.url),
      avatar: subscription.avatar,
    };
  } catch (error) {
    console.error(`抓取 ${subscription.url} 失败:`, error.message);
    // 返回默认数据，确保即使抓取失败也能生成条目
    return {
      blog_name: subscription.name || '未知博客',
      title: '',
      published: '',
      link: subscription.url,
      avatar: subscription.avatar,
    };
  }
}

/**
 * 格式化日期
 */
function formatDate(dateString) {
  if (!dateString) return '未知';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '未知';
    
    // 格式化为 YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch {
    return '未知';
  }
}

/**
 * 并发抓取所有 RSS 源
 */
async function fetchAllFeeds(subscriptions) {
  const results = [];
  
  // 分批处理，控制并发数
  for (let i = 0; i < subscriptions.length; i += CONFIG.concurrency) {
    const batch = subscriptions.slice(i, i + CONFIG.concurrency);
    const batchResults = await Promise.all(batch.map(fetchRssFeed));
    results.push(...batchResults);
  }
  
  return results;
}

/**
 * 主函数
 */
async function main() {
  console.log('开始从 RSS 订阅源抓取数据...');
  
  try {
    // 读取订阅列表
    const { subscriptions } = readSubscriptions();
    
    if (subscriptions.length === 0) {
      console.warn('订阅列表为空，生成空的 feeds.json');
      const emptyFeeds = { items: [] };
      fs.writeFileSync(CONFIG.outputPath, JSON.stringify(emptyFeeds, null, 2));
      console.log(`数据保存成功: ${CONFIG.outputPath}`);
      return;
    }
    
    // 抓取所有 feeds
    const items = await fetchAllFeeds(subscriptions);
    
    // 生成 feeds.json
    const now = new Date();
    const updated = `${now.getFullYear()}年${String(now.getMonth() + 1).padStart(2, '0')}月${String(now.getDate()).padStart(2, '0')}日 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    
    const feedsData = { 
      items,
      updated 
    };
    
    // 确保输出目录存在
    const outputDir = path.dirname(CONFIG.outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`创建目录: ${outputDir}`);
    }
    
    // 保存数据
    fs.writeFileSync(CONFIG.outputPath, JSON.stringify(feedsData, null, 2));
    console.log(`数据保存成功: ${CONFIG.outputPath}`);
    console.log(`共抓取 ${items.length} 个博客`);
    
  } catch (error) {
    console.error('抓取数据失败:', error.message);
    // 不中断构建流程，使用旧数据
    if (fs.existsSync(CONFIG.outputPath)) {
      console.log('使用本地缓存数据');
    }
  }
}

// 执行主函数
main().then(() => {
  console.log('RSS 数据抓取完成');
  process.exit(0);
}).catch((error) => {
  console.error('RSS 数据抓取失败:', error);
  process.exit(1);
});
