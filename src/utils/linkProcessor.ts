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

function normalizeHeadingHash(hash: string): string {
  return hash
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\p{L}\p{N}-]/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function resolveMarkdownFilePath(
  sourcePath: string,
  currentFilePath?: string
): string | undefined {
  const projectRoot = process.cwd();
  const currentDir = currentFilePath
    ? path.dirname(currentFilePath)
    : projectRoot;
  const decodedSource = decodeURIComponent(sourcePath);
  const hasMdExt = /\.(md|mdx)$/i.test(decodedSource);
  const ext = path.extname(decodedSource);
  const candidates = hasMdExt
    ? [decodedSource]
    : ext
      ? []
      : [`${decodedSource}.md`, `${decodedSource}.mdx`];

  for (const candidate of candidates) {
    const resolved = resolveRelativePath(candidate, currentDir).replace(
      /\\/g,
      "/"
    );
    if (fs.existsSync(resolved)) {
      return resolved;
    }

    const blogDir = path.resolve(projectRoot, BLOG_PATH);
    const relativePath = path.relative(projectRoot, resolved);
    const blogFilePath = path.join(blogDir, relativePath);
    if (fs.existsSync(blogFilePath)) {
      return blogFilePath.replace(/\\/g, "/");
    }
  }

  return undefined;
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

  const [rawPath, rawHash] = href.split("#", 2);
  const isMarkdownLink =
    /\.(md|mdx)$/i.test(rawPath) || path.extname(rawPath.trim()) === "";

  if (!isMarkdownLink) {
    return href;
  }

  try {
    const targetFilePath = resolveMarkdownFilePath(rawPath, currentFilePath);
    if (!targetFilePath) {
      return href;
    }

    // 提取slug
    const slug = extractSlugFromFile(targetFilePath);
    const hashSuffix = rawHash ? `#${normalizeHeadingHash(rawHash)}` : "";
    if (slug) {
      // 无论 slug 是否包含分类路径，最终 URL 只保留最后一级 slug
      const finalSlug = slug
        .split("/")
        .filter(Boolean)
        .pop()
        ?.replace(/\s/g, "-")
        .toLowerCase();
      return finalSlug ? `/posts/${finalSlug}${hashSuffix}` : href;
    }

    // 如果没有slug，使用文件名作为最终 slug（忽略目录）
    const fileSlug = path
      .basename(targetFilePath, path.extname(targetFilePath))
      .replace(/\s/g, "-")
      .toLowerCase();

    return `/posts/${fileSlug}${hashSuffix}`;
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
  return text.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, (_, linkText, href) => {
    const processedHref = processLink(href, currentFilePath);
    return `[${linkText}](${processedHref})`;
  });
}
