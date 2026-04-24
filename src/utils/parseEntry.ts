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

// 解析碎片条目的函数
export async function parseEntry(entry: CollectionEntry<"diary">) {
  const date = entry.id.split("/").pop()!.replace(".md", "");
  const currentFilePath =
    entry.filePath ?? path.resolve(process.cwd(), DIARY_PATH, entry.id);
  const linkClass =
    "break-words text-foreground underline decoration-dashed decoration-accent/40 underline-offset-4 hover:text-accent hover:decoration-accent/80 focus-visible:no-underline";

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

    const cardBlockRegex = /```card-(movie|tv|book|music)[^\n]*\n?[\s\S]*?```/;
    const cardBlockMatch = cardBlockRegex.exec(blockContent);
    const rawTextBeforeCard = cardBlockMatch
      ? blockContent.slice(0, cardBlockMatch.index)
      : blockContent;
    const rawTextAfterCard = cardBlockMatch
      ? blockContent.slice(cardBlockMatch.index + cardBlockMatch[0].length)
      : "";

    const originalBlockContent = blockContent;

    const applyMarkdown = (input: string) => {
      let t = (input || "").trim();
      t = t.replace(/```(imgs|html|card-[^\n]*)[\s\S]*?```/g, "").trim();
      t = t.replace(/%%[\s\S]*?%%/g, "");

      t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
      t = t.replace(
        /__([^_]+)__/g,
        "<mark class='bg-accent/20 text-foreground px-0.5'>$1</mark>"
      );

      t = t.replace(/\*([^*]+)\*/g, "<em>$1</em>");
      t = t.replace(/_(.+?)_/g, "<em>$1</em>");

      t = t.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, (_, linkText, href) => {
        const processedHref = processLink(href, currentFilePath);
        const isExternal = /^https?:\/\//.test(processedHref);
        const externalAttrs = isExternal
          ? ' target="_blank" rel="noopener noreferrer"'
          : "";
        return `<a href="${processedHref}"${externalAttrs} class="${linkClass}">${linkText}</a>`;
      });

      t = t.replace(
        /!\[([^\]]*)\]\(([^\s)]+)(?:\s+"([^"]*)"|\s+'([^']*)')?\)/g,
        (_, alt, src, title1, title2) => {
          const title = title1 || title2 || "";
          return `<img src="${src}" alt="${alt}" title="${title}" class="my-4 max-w-full h-auto rounded-lg shadow-md" />`;
        }
      );

      t = t.replace(/!\[\[([^[\]]+?)\]\]/g, (_, inner: string) => {
        const [targetRaw, aliasRaw = ""] = inner.split("|", 2);
        const target = targetRaw.trim();
        const alias = aliasRaw.trim();
        if (!target) return _;
        if (/\.(png|jpe?g|gif|webp|svg|avif)$/i.test(target)) {
          const alt =
            alias ||
            target
              .split("/")
              .pop()
              ?.replace(/\.[^.]+$/, "") ||
            "";
          return `<img src="${target}" alt="${alt}" class="my-4 max-w-full h-auto rounded-lg shadow-md" />`;
        }
        const linkText = alias || target.split("/").pop() || target;
        return `<a href="${target}" target="_blank" rel="noopener noreferrer" class="${linkClass}">${linkText}</a>`;
      });

      t = t.replace(/\[\[([^[\]]+?)\]\]/g, (_, inner: string) => {
        const [targetWithHeading, aliasRaw = ""] = inner.split("|", 2);
        const [targetRaw, headingRaw = ""] = targetWithHeading.split("#", 2);
        const target = targetRaw.trim();
        const heading = headingRaw.trim();
        const alias = aliasRaw.trim();
        if (!target) return _;
        const normalizedTarget =
          target.includes(".") || target.startsWith("/")
            ? target
            : `${target}.md`;
        const finalHref = processLink(
          heading ? `${normalizedTarget}#${heading}` : normalizedTarget,
          currentFilePath
        );
        const linkText =
          alias ||
          target
            .split("/")
            .pop()
            ?.replace(/\.[^.]+$/, "") ||
          target;
        const isExternal = /^https?:\/\//.test(finalHref);
        const externalAttrs = isExternal
          ? ' target="_blank" rel="noopener noreferrer"'
          : "";
        return `<a href="${finalHref}"${externalAttrs} class="${linkClass}">${linkText}</a>`;
      });

      t = t.replace(/((?:^- .+(?:\n|$))+)/gm, match => {
        const items = match
          .split("\n")
          .filter(line => line.trim().startsWith("- "))
          .map(
            line =>
              `<li class="ml-4 list-disc">${line.substring(2).trim()}</li>`
          )
          .join("");
        return `<ul class="mt-1 mb-2 pl-2">${items}</ul>`;
      });

      t = t.replace(/((?:^\d+\. .+(?:\n|$))+)/gm, match => {
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

      t = t.replace(/((?:^>.*(?:\n|$))+)/gm, match => {
        const lines = match
          .split("\n")
          .filter(line => line.trim().startsWith(">"))
          .map(line => line.replace(/^>\s?/, "").trim());

        const firstNonEmptyIndex = lines.findIndex(l => l.trim().length > 0);
        const firstLine =
          firstNonEmptyIndex >= 0 ? lines[firstNonEmptyIndex] : "";
        const calloutMatch = firstLine.match(/^\[!([^\]]+)\]([+-])?\s*(.*)$/);

        if (calloutMatch) {
          const rawType = calloutMatch[1].trim();
          const calloutType = rawType
            .toLowerCase()
            .replace(/[\s_]+/g, "-")
            .replace(/[^a-z0-9-]/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "");
          const title =
            (calloutMatch[3] || "").trim() ||
            rawType
              .replace(/[-_]+/g, " ")
              .replace(/\b([a-z])/g, (_, c) => c.toUpperCase());
          const body = lines.slice(firstNonEmptyIndex + 1).join("<br />");
          return `<blockquote class="callout callout-${calloutType} my-6 rounded-md border border-border/60 border-l-4 bg-muted/28 px-4 py-3 break-words text-foreground/88 not-italic"><div class="callout-title mb-2 font-semibold">${title}</div>${body}</blockquote>`;
        }

        const body = lines.join("<br />");
        return `<blockquote class="relative my-6 rounded-md border border-border/60 border-l-4 border-l-accent/65 bg-muted/28 px-4 py-3 break-words text-foreground/88 not-italic"><span aria-hidden="true" class="pointer-events-none absolute -top-3 left-2 text-4xl leading-none text-accent/28">"</span>${body}</blockquote>`;
      });

      t = t.replace(
        /`([^`]+)`/g,
        "<code class='bg-skin-muted px-1.5 py-0.5 rounded text-sm font-mono'>$1</code>"
      );

      t = t.replace(/```([\s\S]*?)```/g, (_, codeContent) => {
        return `<pre class='my-4 bg-skin-muted p-4 rounded-lg overflow-x-auto'><code class='font-mono text-sm'>${codeContent}</code></pre>`;
      });

      t = t.replace(
        /(?:^|\n)\s*[-*_]{3,}\s*(?:\n|$)/g,
        "<hr class='my-6 border-skin-muted/50 border-t border-dashed' />"
      );

      t = t.replace(
        /([^\n])\s*[-*_]{3,}\s*([^\n])/g,
        "$1<hr class='my-6 border-skin-muted/50 border-t border-dashed' />$2"
      );
      t = t.replace(
        /^\s*[-*_]{3,}\s*([^\n])/g,
        "<hr class='my-6 border-skin-muted/50 border-t border-dashed' />$1"
      );
      t = t.replace(
        /([^\n])\s*[-*_]{3,}\s*$/g,
        "$1<hr class='my-6 border-skin-muted/50 border-t border-dashed' />"
      );

      return t;
    };

    let text = applyMarkdown(rawTextBeforeCard);
    let postText = applyMarkdown(rawTextAfterCard);

    // 解析 Markdown 角标引用（脚注）
    // 注意：diary 页面会把多个 md 汇总到同一页；必须为每个时间块命名空间，避免不同文档里重复的 [^1] 冲突。
    const footnotes: Record<string, string> = {};
    const fnScope = `d-${date}-t-${time}`.replace(/[^a-zA-Z0-9_-]/g, "-");

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
      /```(imgs|html|card-[^\n]*)[\s\S]*?```/g,
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

    const applyFootnotesToText = (input: string) => {
      let t = input
        .replace(/\[\^(\d+)\]:\s*([\s\S]*?)(?=\[\^\d+\]:|$)/g, "")
        .trim();

      t = t.replace(/\[\^(\d+)\]/g, (_, id) => {
        const refId = `fnref-${fnScope}-${id}`;
        const tipId = `fntip-${fnScope}-${id}`;
        const rawTip = footnotes[id] ? htmlToPlainText(footnotes[id]) : "";
        const tip = rawTip.length > 240 ? rawTip.slice(0, 240) + "…" : rawTip;
        const tooltipHtml = tip
          ? `<span id="${tipId}" role="tooltip" class="footnote-tooltip">${escapeHtml(tip)}</span>`
          : "";
        const describedBy = tip ? ` aria-describedby="${tipId}"` : "";
        // 碎片不渲染底部脚注列表，用 button 避免 href 指向不存在的 #fn- 锚点
        return `<sup id="${refId}" class="footnote-ref inline-block align-super text-sm"><button type="button" class="text-accent/85 hover:text-accent hover:underline px-0.5 align-baseline border-0 bg-transparent p-0 font-inherit leading-none cursor-pointer"${describedBy}>${id}</button>${tooltipHtml}</sup>`;
      });

      return t;
    };

    text = applyFootnotesToText(text);
    postText = applyFootnotesToText(postText);

    // 碎片仅用语义上的悬停/聚焦提示（.footnote-tooltip），不渲染文末脚注列表

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

    const toParagraphHtml = (input: string) => {
      if (!input) return "";
      const htmlBlockRegex = /<(ul|ol)\b[^>]*>[\s\S]*?<\/\1>/g;
      const htmlBlocks: string[] = [];
      let blockIndex = 0;

      let t = input.replace(htmlBlockRegex, match => {
        const placeholder = `\n__HTML_BLOCK_${blockIndex}__\n`;
        htmlBlocks[blockIndex] = match;
        blockIndex++;
        return placeholder;
      });

      t = t
        .split("\n")
        .filter(line => line.trim() !== "")
        .map(line => {
          const trimmedLine = line.trim();
          if (trimmedLine.includes("__HTML_BLOCK_")) {
            return trimmedLine;
          }
          if (trimmedLine.startsWith("<hr ")) {
            return trimmedLine;
          }
          return `<p class="mb-2">${trimmedLine}</p>`;
        })
        .join("");

      htmlBlocks.forEach((block, index) => {
        t = t.replace(`__HTML_BLOCK_${index}__`, block);
      });

      return t;
    };

    text = toParagraphHtml(text);
    postText = toParagraphHtml(postText);

    if (
      text ||
      postText ||
      images.length > 0 ||
      htmlContent ||
      movieData ||
      tvData ||
      bookData ||
      musicData
    ) {
      timeBlocks.push({
        time,
        text,
        postText,
        images,
        htmlContent,
        movieData,
        tvData,
        bookData,
        musicData,
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
