import fs from "fs";
import path from "path";
import { BLOG_PATH } from "../config";

/**
 * 从markdown文件中提取slug字段
 * @param filePath 文件路径
 * @returns slug值或undefined
 */
function extractSlugFromFile(filePath: string): string | undefined {
  try {
    const content = fs.readFileSync(filePath, "utf-8");

    // 匹配frontmatter中的slug字段
    const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) return undefined;

    const frontmatter = frontmatterMatch[1];
    const slugMatch = frontmatter.match(/^slug:[ \t]*([^\r\n]*)$/m);

    return slugMatch ? slugMatch[1].trim() : undefined;
  } catch {
    return undefined;
  }
}

/**
 * 解析相对路径并转换为绝对路径
 * @param relativePath 相对路径
 * @param basePath 基础路径（当前文件所在目录）
 * @returns 解析后的绝对路径
 */
function resolveRelativePath(relativePath: string, basePath: string): string {
  // 如果是绝对路径，直接返回
  if (path.isAbsolute(relativePath)) return relativePath;

  // 解析相对路径
  return path.resolve(basePath, relativePath);
}

/**
 * 处理链接，将相对路径的blog文件链接转换为/posts/[slug]格式
 * @param href 原始链接
 * @param currentFilePath 当前文件路径（用于解析相对路径）
 * @returns 处理后的链接
 */
export function processLink(href: string, currentFilePath?: string): string {
  // 如果是绝对URL（http/https），直接返回
  if (/^https?:\/\//.test(href)) {
    return href;
  }

  // 如果是锚点链接或其他特殊链接，直接返回
  if (
    href.startsWith("#") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:")
  ) {
    return href;
  }

  // 检查是否为md文件
  if (!/\.(md|mdx)$/i.test(href)) {
    return href;
  }

  try {
    let targetFilePath: string;

    if (currentFilePath) {
      // 如果提供了当前文件路径，解析相对路径
      const currentDir = path.dirname(currentFilePath);
      // 对href进行URL解码，处理空格等特殊字符
      const decodedHref = decodeURIComponent(href);
      targetFilePath = resolveRelativePath(decodedHref, currentDir);
    } else {
      // 否则假设是相对于项目根目录的路径
      const projectRoot = process.cwd();
      const decodedHref = decodeURIComponent(href);
      targetFilePath = path.resolve(projectRoot, decodedHref);
    }

    // 标准化路径分隔符
    targetFilePath = targetFilePath.replace(/\\/g, "/");

    // 检查文件是否存在
    if (!fs.existsSync(targetFilePath)) {
      // 如果文件不存在，尝试在blog目录中查找
      const blogDir = path.resolve(process.cwd(), BLOG_PATH);
      // 计算相对于博客目录的路径
      const relativePath = path.relative(process.cwd(), targetFilePath);
      // 构建博客目录中的文件路径
      const blogFilePath = path.join(blogDir, relativePath);
      // 检查文件是否存在
      if (fs.existsSync(blogFilePath)) {
        targetFilePath = blogFilePath;
      } else {
        // 文件不存在，返回原链接
        return href;
      }
      targetFilePath = blogFilePath;
    }

    // 提取slug
    const slug = extractSlugFromFile(targetFilePath);
    if (slug) {
      // 获取相对路径
      const blogDir = path.resolve(process.cwd(), BLOG_PATH);
      const relativeDir = path
        .dirname(path.relative(blogDir, targetFilePath))
        .replace(/\\/g, "/")
        .replace(/\s/g, "-")
        .toLowerCase();

      // 如果slug已经包含路径，直接使用，否则拼接相对路径
      return slug.includes("/")
        ? `/posts/${slug}`
        : `/posts/${relativeDir}/${slug}`;
    }

    // 如果没有slug，使用相对路径
    const blogDir = path.resolve(process.cwd(), BLOG_PATH);
    const relativePath = path
      .relative(blogDir, targetFilePath)
      .replace(path.extname(targetFilePath), "")
      .replace(/\\/g, "/")
      .replace(/\s/g, "-")
      .toLowerCase();

    return `/posts/${relativePath}`;
  } catch {
    // 出错时返回原链接
    return href;
  }
}

/**
 * 批量处理文本中的所有markdown链接
 * @param text 包含markdown链接的文本
 * @param currentFilePath 当前文件路径
 * @returns 处理后的文本
 */
export function processMarkdownLinks(
  text: string,
  currentFilePath?: string
): string {
  return text.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, (match, linkText, href) => {
    const processedHref = processLink(href, currentFilePath);
    return `[${linkText}](${processedHref})`;
  });
}
