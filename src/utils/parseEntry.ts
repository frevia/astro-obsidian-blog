import path from "path";
import {
  optimizeImage,
  type ImageOptimizeOptions,
} from "@/utils/optimizeImages";
import { getVideoPath } from "@/utils/videoUtils";
import { processLink } from "@/utils/linkProcessor";
import { DIARY_PATH } from "@/config";
import type { CollectionEntry } from "astro:content";

// 通用的poster路径优化函数
async function optimizePosterPath(
  posterPath: string | undefined,
  options?: ImageOptimizeOptions
): Promise<string | undefined> {
  if (!posterPath) return posterPath;

  try {
    const optimizedInfo = await optimizeImage(posterPath, options);
    return optimizedInfo.thumbnail;
  } catch {
    // 失败时使用原始路径
    return posterPath;
  }
}

// 本地电影数据接口
interface LocalMovieData {
  id?: number;
  title: string;
  release_date?: string;
  region?: string;
  rating?: number;
  runtime?: number;
  genres?: string;
  overview?: string;
  poster?: string;
  source?: string;
  external_url?: string;
}

// 本地TV数据接口
interface LocalTVData {
  id?: string;
  title: string;
  release_date?: string;
  region?: string;
  rating?: number;
  genres?: string;
  overview?: string;
  poster?: string;
  source?: string;
  external_url?: string;
}

// 本地书籍数据接口
interface LocalBookData {
  id?: string;
  title: string;
  release_date?: string;
  author?: string;
  rating?: number;
  genres?: string;
  overview?: string;
  poster?: string;
  external_url?: string;
}

// 本地音乐数据接口
interface LocalMusicData {
  title: string;
  author?: string;
  album?: string;
  duration?: number;
  genres?: string;
  poster?: string;
  url?: string;
}

// 解析日记条目的函数
export async function parseEntry(entry: CollectionEntry<"diary">) {
  const date = entry.id.split("/").pop()!.replace(".md", "");
  const currentFilePath =
    entry.filePath ??
    path.resolve(process.cwd(), DIARY_PATH, entry.id);

  // 解析markdown内容，提取时间段和内容
  let content = entry.body || "";
  const timeBlocks = [];

  // 首先处理文件开头可能存在的分割线
  // 查找文件开头的分割线
  const startDividerMatch = content.match(/^(?:\s*[-*_]{3,}\s*\n)+/);
  if (startDividerMatch) {
    // 创建一个特殊的时间块来显示文件开头的分割线
    timeBlocks.push({
      time: "00:00",
      text: "<hr class='my-6 border-skin-muted/50 border-t border-dashed' />",
      images: [],
      htmlContent: "",
      movieData: undefined,
      tvData: undefined,
      bookData: undefined,
      musicData: undefined,
    });
    // 移除文件开头的分割线，避免重复处理
    content = content.substring(startDividerMatch[0].length);
  }

  // 使用正则表达式匹配时间块
  const timeRegex = /## (\d{2}:\d{2})([\s\S]*?)(?=## \d{2}:\d{2}|$)/g;
  let match;
  let lastMatchEnd = 0;

  while ((match = timeRegex.exec(content)) !== null) {
    const time = match[1];
    const blockContent = match[2];

    // 检查当前时间块与上一个时间块之间是否有分割线
    const contentBetweenBlocks = content.substring(lastMatchEnd, match.index);
    if (contentBetweenBlocks.match(/(?:^|\n)\s*[-*_]{3,}\s*(?:\n|$)/)) {
      // 如果有，添加一个特殊的时间块来显示分割线
      timeBlocks.push({
        time: "00:00",
        text: "<hr class='my-6 border-skin-muted/50 border-t border-dashed' />",
        images: [],
        htmlContent: "",
        movieData: undefined,
        tvData: undefined,
        bookData: undefined,
        musicData: undefined,
      });
    }

    lastMatchEnd = match.index + match[0].length;

    // 提取文本内容（在```imgs、```html、```card-之前的部分）
    const textMatch = blockContent.match(
      /^([\s\S]*?)(?=```imgs|```html|```card-|$)/
    );
    let text = textMatch ? textMatch[1].trim() : blockContent.trim();

    // 保存原始blockContent用于提取脚注定义
    const originalBlockContent = blockContent;

    // 移除代码块标识
    text = text.replace(/```(imgs|html|card-[\s\S]*?)[\s\S]*?```/g, "").trim();

    // 解析 Markdown 加粗语法为 HTML strong mark 标签
    // 处理 **text** 格式
    text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    // 处理 __text__ 格式
    text = text.replace(
      /__([^_]+)__/g,
      "<mark class='bg-accent/20 text-foreground px-0.5'>$1</mark>"
    );

    // 解析 Markdown 斜体语法为 HTML em 标签
    // 处理 *text* 格式
    text = text.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    // 处理 _text_ 格式
    text = text.replace(/_(.+?)_/g, "<em>$1</em>");

    // 解析 Markdown 链接为 HTML 链接，并处理相对路径
    text = text.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, (_, linkText, href) => {
      const processedHref = processLink(href, currentFilePath);
      return `<a href="${processedHref}" target="_blank" rel="noopener noreferrer" class="text-skin-accent font-semibold underline decoration-2 underline-offset-2 hover:decoration-4 hover:text-skin-accent-2 transition-all duration-200">${linkText}</a>`;
    });

    // 解析 Markdown 图片为 HTML img 标签
    text = text.replace(
      /!\[([^\]]*)\]\(([^\s)]+)(?:\s+"([^"]*)"|\s+'([^']*)')?\)/g,
      (_, alt, src, title1, title2) => {
        const title = title1 || title2 || "";
        return `<img src="${src}" alt="${alt}" title="${title}" class="my-4 max-w-full h-auto rounded-lg shadow-md" />`;
      }
    );

    // 解析 Markdown 无序列表为 HTML ul/li
    text = text.replace(/((?:^- .+(?:\n|$))+)/gm, match => {
      const items = match
        .split("\n")
        .filter(line => line.trim().startsWith("- "))
        .map(
          line => `<li class="ml-4 list-disc">${line.substring(2).trim()}</li>`
        )
        .join("");
      return `<ul class="mt-1 mb-2 pl-2">${items}</ul>`;
    });

    // 解析 Markdown 有序列表为 HTML ol/li
    text = text.replace(/((?:^\d+\. .+(?:\n|$))+)/gm, match => {
      const items = match
        .split("\n")
        .filter(line => /^\d+\. /.test(line.trim()))
        .map(
          line =>
            `<li class="ml-4 list-decimal">${line.replace(/^\d+\. /, "").trim()}</li>`
        )
        .join("");
      return `<ol class="mt-1 mb-2 pl-2">${items}</ol>`;
    });

    // 解析 Markdown 引用为 HTML blockquote
    text = text.replace(/((?:^> .+(?:\n|$))+)/gm, match => {
      const lines = match
        .split("\n")
        .filter(line => line.trim().startsWith("> "))
        .map(line => line.substring(2).trim())
        .join("\n");
      return `<blockquote class="relative my-6 rounded-md border border-border/60 border-l-4 border-l-accent/65 bg-muted/28 px-4 py-3 break-words text-foreground/88 not-italic"><span aria-hidden="true" class="pointer-events-none absolute -top-3 left-2 text-4xl leading-none text-accent/28">"</span>${lines}</blockquote>`;
    });

    // 解析 Markdown 行内代码为 HTML code
    text = text.replace(
      /`([^`]+)`/g,
      "<code class='bg-skin-muted px-1.5 py-0.5 rounded text-sm font-mono'>$1</code>"
    );

    // 解析 Markdown 代码块为 HTML pre/code
    text = text.replace(/```([\s\S]*?)```/g, (_, codeContent) => {
      return `<pre class='my-4 bg-skin-muted p-4 rounded-lg overflow-x-auto'><code class='font-mono text-sm'>${codeContent}</code></pre>`;
    });

    // 解析 Markdown 分割线为 HTML hr 标签
    text = text.replace(
      /(?:^|\n)\s*[-*_]{3,}\s*(?:\n|$)/g,
      "<hr class='my-6 border-skin-muted/50 border-t border-dashed' />"
    );

    // 额外处理前后没有空行的分割线
    text = text.replace(
      /([^\n])\s*[-*_]{3,}\s*([^\n])/g,
      "$1<hr class='my-6 border-skin-muted/50 border-t border-dashed' />$2"
    );
    text = text.replace(
      /^\s*[-*_]{3,}\s*([^\n])/g,
      "<hr class='my-6 border-skin-muted/50 border-t border-dashed' />$1"
    );
    text = text.replace(
      /([^\n])\s*[-*_]{3,}\s*$/g,
      "$1<hr class='my-6 border-skin-muted/50 border-t border-dashed' />"
    );

    // 解析 Markdown 角标引用（脚注）
    // 注意：diary 页面会把多个 md 汇总到同一页；必须为每个时间块命名空间，避免不同文档里重复的 [^1] 冲突。
    const footnotes: Record<string, string> = {};
    const fnScope = `d-${date}-t-${time}`.replace(/[^a-zA-Z0-9_-]/g, "-");
    let footnoteHtml = "";

    const escapeHtml = (s: string) =>
      s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const htmlToPlainText = (s: string) =>
      s
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>\s*<p>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

    // 从原始blockContent中提取角标定义，而不仅仅是text部分
    // 这样可以处理脚注定义在代码块之后的情况
    let contentForFootnotes = originalBlockContent;
    // 移除代码块内容，只保留代码块标识
    contentForFootnotes = contentForFootnotes.replace(
      /```(imgs|html|card-[\s\S]*?)[\s\S]*?```/g,
      "```$1```"
    );

    // 提取角标定义
    contentForFootnotes.replace(
      /\[\^(\d+)\]:\s*([\s\S]*?)(?=\[\^\d+\]:|$)/g,
      (_, id, content) => {
        footnotes[id] = content.trim();
        return "";
      }
    );

    // 从text中移除脚注定义（如果有的话）
    text = text
      .replace(/\[\^(\d+)\]:\s*([\s\S]*?)(?=\[\^\d+\]:|$)/g, "")
      .trim();

    // 替换角标引用
    text = text.replace(/\[\^(\d+)\]/g, (_, id) => {
      const refId = `fnref-${fnScope}-${id}`;
      const noteId = `fn-${fnScope}-${id}`;
      const tipId = `fntip-${fnScope}-${id}`;
      const rawTip = footnotes[id] ? htmlToPlainText(footnotes[id]) : "";
      const tip = rawTip.length > 240 ? rawTip.slice(0, 240) + "…" : rawTip;
      const tooltipHtml = tip
        ? `<span id="${tipId}" role="tooltip" class="footnote-tooltip">${escapeHtml(tip)}</span>`
        : "";
      const describedBy = tip ? ` aria-describedby="${tipId}"` : "";
      return `<sup id="${refId}" class="footnote-ref inline-block align-super text-sm"><a href="#${noteId}" class="text-skin-accent hover:underline px-0.5"${describedBy}>${id}</a>${tooltipHtml}</sup>`;
    });

    // 角标定义 HTML：延后到段落拆分后再 append，避免被 <p> 包裹破坏结构
    if (Object.keys(footnotes).length > 0) {
      footnoteHtml =
        '<div class="footnotes mt-6 pt-4 border-t border-skin-muted/50 text-sm text-skin-base/80">';
      Object.entries(footnotes).forEach(([id, content]) => {
        const noteId = `fn-${fnScope}-${id}`;
        const refId = `fnref-${fnScope}-${id}`;
        // 处理脚注内容中的链接
        const safeContent = content
          .replace(/\[([^\]]+)\]\(([^\)]+)\)/g, (_, linkText, href) => {
            const processedHref = processLink(href, currentFilePath);
            return `<a href="${processedHref}" target="_blank" rel="noopener noreferrer" class="text-skin-accent font-semibold underline decoration-2 underline-offset-2 hover:decoration-4 hover:text-skin-accent-2 transition-all duration-200">${linkText}</a>`;
          })
          .replace(/\n+/g, "<br />");
        footnoteHtml += `<div id="${noteId}" class="footnote-item flex items-start gap-2 py-2 first:pt-0"><span class="footnote-id flex-none w-4 text-right">${id}.</span><span class="footnote-content flex-1">${safeContent}</span><a href="#${refId}" class="footnote-backref flex-none text-skin-accent hover:underline ml-2">↩</a></div>`;
      });
      footnoteHtml += "</div>";
    }

    // 提取图片并优化
    const images = [];
    const imgMatches = blockContent.match(/```imgs([\s\S]*?)```/);
    if (imgMatches) {
      const imgContent = imgMatches[1];
      const imgRegex =
        /!\[([^\]]*)\]\(([^\s)]+)(?:\s+"([^"]*)"|\s+\'([^\']*)\')?\)/g;
      let imgMatch;
      while ((imgMatch = imgRegex.exec(imgContent)) !== null) {
        const src = imgMatch[2];
        const title = imgMatch[3] || imgMatch[4] || ""; // 支持双引号或单引号的title

        // 处理相对路径的图片
        try {
          // 使用完整的优化函数，获取包含尺寸信息的对象
          const optimizedInfo = await optimizeImage(src, {
            needFullSize: true,
          });
          images.push({
            alt: imgMatch[1],
            src: optimizedInfo.thumbnail,
            original: optimizedInfo.original,
            title: title,
            width: optimizedInfo.width,
            height: optimizedInfo.height,
          });
        } catch {
          // 失败时使用原始路径和默认尺寸
          images.push({
            alt: imgMatch[1],
            original: src,
            src: src,
            title: title,
            width: 400,
            height: 300,
          });
        }
      }
    }

    // 提取HTML内容并处理其中的attachment路径
    const htmlMatches = blockContent.match(/```html([\s\S]*?)```/);
    let htmlContent = htmlMatches ? htmlMatches[1].trim() : "";

    // 处理HTML中包含attachment路径的媒体文件
    if (htmlContent) {
      // 处理所有包含attachment路径的媒体属性（src和poster）
      const mediaAttributeMatches = [
        ...htmlContent.matchAll(
          /(src|poster)="((?!http)[^"]*attachment\/[^"]*?)"/gi
        ),
      ];

      for (const match of mediaAttributeMatches) {
        const [fullMatch, attribute, src] = match;

        if (
          src.match(
            /\.(mp4|webm|ogg|avi|mov|wmv|flv|mkv|mp3|wav|ogg|aac|flac|m4a)$/i
          )
        ) {
          // 视频和音频文件使用getVideoPath处理
          const videoPath = getVideoPath(src);
          htmlContent = htmlContent.replace(
            fullMatch,
            `${attribute}="${videoPath}"`
          );
        } else if (
          src.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg|ico|tiff|tif)$/i)
        ) {
          // 图片文件使用optimizeImage处理
          try {
            const isPoster = attribute.toLowerCase() === "poster";
            const optimizedInfo = await optimizeImage(
              src,
              isPoster ? { keepOriginalSize: true, quality: 50 } : undefined
            );
            htmlContent = htmlContent.replace(
              fullMatch,
              `${attribute}="${optimizedInfo.thumbnail}"`
            );
          } catch {
            // 失败时保持原始路径
          }
        }
      }
    }

    // 提取电影卡片数据
    let movieData: LocalMovieData | undefined = undefined;
    const cardMovieMatches = blockContent.match(/```card-movie([\s\S]*?)```/);
    if (cardMovieMatches) {
      const cardContent = cardMovieMatches[1].trim();

      // 解析电影信息
      const parseField = (field: string): string | undefined => {
        const match = cardContent.match(new RegExp(`${field}:\s*(.+)`, "m"));
        return match ? match[1].trim() : undefined;
      };

      const parseNumber = (field: string): number | undefined => {
        const value = parseField(field);
        return value ? parseFloat(value) : undefined;
      };

      const title = parseField("title");
      if (title) {
        const optimizedPoster = await optimizePosterPath(parseField("poster"));

        movieData = {
          id: parseNumber("id"),
          title,
          release_date: parseField("release_date"),
          region: parseField("region"),
          rating: parseNumber("rating"),
          runtime: parseNumber("runtime"),
          genres: parseField("genres"),
          overview: parseField("overview"),
          poster: optimizedPoster,
          source: parseField("source"),
          external_url: parseField("external_url"),
        };
      }
    }

    // 提取TV剧集卡片数据
    let tvData: LocalTVData | undefined = undefined;
    const cardTVMatches = blockContent.match(/```card-tv([\s\S]*?)```/);
    if (cardTVMatches) {
      const cardContent = cardTVMatches[1].trim();

      // 解析TV信息
      const parseField = (field: string): string | undefined => {
        const match = cardContent.match(new RegExp(`${field}:\s*(.+)`, "m"));
        return match ? match[1].trim() : undefined;
      };

      const parseNumber = (field: string): number | undefined => {
        const value = parseField(field);
        return value ? parseFloat(value) : undefined;
      };

      const title = parseField("title");
      if (title) {
        const optimizedPoster = await optimizePosterPath(parseField("poster"));

        tvData = {
          id: parseField("id"),
          title,
          release_date: parseField("release_date"),
          region: parseField("region"),
          rating: parseNumber("rating"),
          genres: parseField("genres"),
          overview: parseField("overview"),
          poster: optimizedPoster,
          source: parseField("source"),
          external_url: parseField("external_url"),
        };
      }
    }

    // 提取书籍卡片数据
    let bookData: LocalBookData | undefined = undefined;
    const cardBookMatches = blockContent.match(/```card-book([\s\S]*?)```/);
    if (cardBookMatches) {
      const cardContent = cardBookMatches[1].trim();

      // 解析书籍信息
      const parseField = (field: string): string | undefined => {
        const match = cardContent.match(new RegExp(`${field}:\s*(.+)`, "m"));
        return match ? match[1].trim() : undefined;
      };

      const parseNumber = (field: string): number | undefined => {
        const value = parseField(field);
        return value ? parseFloat(value) : undefined;
      };

      const title = parseField("title");
      if (title) {
        const optimizedPoster = await optimizePosterPath(parseField("poster"));

        bookData = {
          id: parseField("id"),
          title,
          release_date: parseField("release_date"),
          author: parseField("author"),
          rating: parseNumber("rating"),
          genres: parseField("genres"),
          overview: parseField("overview"),
          poster: optimizedPoster,
          external_url: parseField("external_url"),
        };
      }
    }

    // 提取音乐卡片数据
    let musicData: LocalMusicData | undefined = undefined;
    const cardMusicMatches = blockContent.match(/```card-music([\s\S]*?)```/);
    if (cardMusicMatches) {
      const cardContent = cardMusicMatches[1].trim();

      // 解析音乐信息
      const parseField = (field: string): string | undefined => {
        const match = cardContent.match(new RegExp(`${field}:\s*(.+)`, "m"));
        return match ? match[1].trim() : undefined;
      };

      const parseNumber = (field: string): number | undefined => {
        const value = parseField(field);
        return value ? parseFloat(value) : undefined;
      };

      const title = parseField("title");
      if (title) {
        const optimizedPoster = await optimizePosterPath(parseField("poster"));

        musicData = {
          title,
          author: parseField("author"),
          album: parseField("album"),
          duration: parseNumber("duration"),
          genres: parseField("genres"),
          poster: optimizedPoster,
          url: parseField("url"),
        };
      }
    }

    // 最后处理：将每个换行转换为独立的p段落
    // 先标记已处理的ul、ol块，避免内部换行被处理
    const htmlBlockRegex = /<(ul|ol)\b[^>]*>[\s\S]*?<\/\1>/g;
    const htmlBlocks: string[] = [];
    let blockIndex = 0;

    // 用占位符替换HTML块
    text = text.replace(htmlBlockRegex, match => {
      // 为HTML块前后添加换行符
      const placeholder = `\n__HTML_BLOCK_${blockIndex}__\n`;
      htmlBlocks[blockIndex] = match;
      blockIndex++;
      return placeholder;
    });

    // 处理剩余文本的换行
    text = text
      .split("\n")
      .filter(line => line.trim() !== "") // 过滤空行
      .map(line => {
        const trimmedLine = line.trim();
        // 检查是否为占位符
        if (trimmedLine.includes("__HTML_BLOCK_")) {
          return trimmedLine;
        }
        return `<p class="mb-2">${trimmedLine}</p>`;
      })
      .join("");

    // 恢复HTML块
    htmlBlocks.forEach((block, index) => {
      text = text.replace(`__HTML_BLOCK_${index}__`, block);
    });

    if (
      text ||
      images.length > 0 ||
      htmlContent ||
      movieData ||
      tvData ||
      bookData ||
      musicData ||
      footnoteHtml
    ) {
      timeBlocks.push({
        time,
        text,
        images,
        htmlContent,
        movieData,
        tvData,
        bookData,
        musicData,
        footnoteHtml,
      });
    }
  }

  // 处理文件结尾可能存在的分割线
  const endDividerMatch = content
    .substring(lastMatchEnd)
    .match(/\s*[-*_]{3,}\s*$/);
  if (endDividerMatch) {
    timeBlocks.push({
      time: "23:59",
      text: "<hr class='my-6 border-skin-muted/50 border-t border-dashed' />",
      images: [],
      htmlContent: "",
      movieData: undefined,
      tvData: undefined,
      bookData: undefined,
      musicData: undefined,
    });
  }

  // 按时间倒序排列时间块（最新的时间在前）
  timeBlocks.sort((a, b) => {
    const timeA = a.time.replace(":", "");
    const timeB = b.time.replace(":", "");
    return timeB.localeCompare(timeA);
  });

  return {
    date,
    timeBlocks,
  };
}
