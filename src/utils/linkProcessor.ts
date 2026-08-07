import fs from "fs";
import path from "path";
import { slug as slugSegment } from "github-slugger";
import { BLOG_PATH, WIKI_PATH } from "../config";

export type ContentRoutePrefix = "/posts" | "/wiki";

/**
 * 从 markdown 文件中提取作为文章路由的 slug 字段
 * @param filePath 文件路径
 * @returns slug 值或 undefined
 */
function extractSlugFromFile(filePath: string): string | undefined {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) return undefined;

    const slugMatch = frontmatterMatch[1].match(/^slug:[ \t]*([^\r\n]*)$/m);
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

function isPathWithin(filePath: string, directoryPath: string): boolean {
  const relativePath = path.relative(directoryPath, filePath);
  return (
    relativePath === "" ||
    (!relativePath.startsWith("..") && !path.isAbsolute(relativePath))
  );
}

function contentRoutePrefix(
  targetFilePath: string
): ContentRoutePrefix | undefined {
  const projectRoot = process.cwd();
  const wikiDir = path.resolve(projectRoot, WIKI_PATH);
  const blogDir = path.resolve(projectRoot, BLOG_PATH);

  if (isPathWithin(targetFilePath, wikiDir)) return "/wiki";
  if (isPathWithin(targetFilePath, blogDir)) return "/posts";

  // The markdown processor has characterization fixtures under src/markdown;
  // retain their historic article semantics without treating arbitrary files
  // elsewhere in the project as public posts.
  const fixturesDir = path.resolve(projectRoot, "src/markdown/fixtures");
  if (isPathWithin(targetFilePath, fixturesDir)) return "/posts";

  // Fail closed: files from private/unknown directories must not become a
  // public article route merely because they happen to contain frontmatter.
  return undefined;
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
  const candidates = hasMdExt
    ? [decodedSource]
    : [`${decodedSource}.md`, `${decodedSource}.mdx`];

  for (const candidate of candidates) {
    const resolved = resolveRelativePath(candidate, currentDir).replace(
      /\\/g,
      "/"
    );
    if (fs.existsSync(resolved)) {
      return resolved;
    }

    // Bare and qualified wikilinks are resolved from each public collection's
    // root as a convenience (for example `concepts/数字证书` from a wiki page).
    // The route classifier below still decides whether the resolved file may be
    // exposed; merely finding a file is never enough to publish it.
    for (const collectionDir of [
      path.resolve(projectRoot, BLOG_PATH),
      path.resolve(projectRoot, WIKI_PATH),
    ]) {
      const collectionFilePath = path.join(collectionDir, decodedSource);
      if (fs.existsSync(collectionFilePath)) {
        return collectionFilePath.replace(/\\/g, "/");
      }
    }
  }

  return undefined;
}

/**
 * 处理链接，将内容文件链接转换为对应集合的公开路由
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

  try {
    const targetFilePath = resolveMarkdownFilePath(rawPath, currentFilePath);
    if (!targetFilePath) {
      return href;
    }

    const hashSuffix = rawHash ? `#${normalizeHeadingHash(rawHash)}` : "";
    const routePrefix = contentRoutePrefix(targetFilePath);
    if (!routePrefix) return href;

    if (routePrefix === "/wiki") {
      const wikiDir = path.resolve(process.cwd(), WIKI_PATH);
      const wikiRelativePath = path.relative(wikiDir, targetFilePath);
      if (
        !wikiRelativePath ||
        wikiRelativePath.startsWith("..") ||
        path.isAbsolute(wikiRelativePath)
      ) {
        return href;
      }

      const routeId = wikiRelativePath
        .replace(/\\/g, "/")
        .replace(/\.(?:md|mdx)$/i, "")
        .split("/")
        .filter(Boolean)
        .map(segment => slugSegment(segment))
        .join("/");
      return routeId ? `/wiki/${routeId}${hashSuffix}` : href;
    }

    const slug = extractSlugFromFile(targetFilePath);
    if (slug) {
      const finalSlug = slug
        .split("/")
        .filter(Boolean)
        .pop()
        ?.replace(/\s/g, "-")
        .toLowerCase();
      return finalSlug ? `${routePrefix}/${finalSlug}${hashSuffix}` : href;
    }

    // 没有 frontmatter slug 时，回退到集合默认使用的文件名。
    const fileSlug = path.basename(
      targetFilePath,
      path.extname(targetFilePath)
    );

    return `${routePrefix}/${fileSlug}${hashSuffix}`;
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
