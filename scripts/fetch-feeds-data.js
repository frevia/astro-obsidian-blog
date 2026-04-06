#!/usr/bin/env node

/**
 * 抓取邻居 feeds 数据并保存到本地
 * 
 * 功能：
 * 1. 从外部 API 抓取 JSON 数据
 * 2. 保存到本地 public/data/feeds.json 文件
 * 3. 处理错误情况和日志输出
 * 
 * 用法：
 * - 手动执行：node scripts/fetch-feeds-data.js
 * - 构建后自动执行：通过 package.json 配置
 */

import fs from 'fs';
import path from 'path';
import https from 'https';

// 配置
const CONFIG = {
  // 外部数据源 URL
  dataSourceUrl: 'https://cos.lhasa.icu/lhasaRSS/data.json',
  // 本地保存路径
  outputPath: path.join(process.cwd(), 'public', 'data', 'feeds.json'),
  // 超时时间（毫秒）
  timeout: 10000,
};

/**
 * 抓取数据
 */
async function fetchFeedsData() {
  console.log('开始抓取邻居 feeds 数据...');
  
  try {
    // 确保输出目录存在
    const outputDir = path.dirname(CONFIG.outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`创建目录: ${outputDir}`);
    }

    // 抓取数据
    const data = await fetchDataFromUrl(CONFIG.dataSourceUrl);
    
    // 验证数据格式
    if (!data || typeof data !== 'object' || !Array.isArray(data.items)) {
      throw new Error('数据格式不正确，缺少 items 数组');
    }

    // 保存数据到本地
    fs.writeFileSync(CONFIG.outputPath, JSON.stringify(data, null, 2));
    console.log(`数据保存成功: ${CONFIG.outputPath}`);
    console.log(`共抓取 ${data.items.length} 条记录`);
    
  } catch (error) {
    console.error('抓取数据失败:', error.message);
    // 不中断构建流程，使用旧数据
    if (fs.existsSync(CONFIG.outputPath)) {
      console.log('使用本地缓存数据');
    }
  }
}

/**
 * 从 URL 抓取数据
 */
function fetchDataFromUrl(url) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('请求超时'));
    }, CONFIG.timeout);

    https.get(url, (response) => {
      clearTimeout(timeout);
      
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP 错误: ${response.statusCode}`));
        return;
      }

      let data = '';
      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
          resolve(parsedData);
        } catch (error) {
          reject(new Error('解析 JSON 失败'));
        }
      });

    }).on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

// 执行抓取
fetchFeedsData();