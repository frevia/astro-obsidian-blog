import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineMdastPlugin } from "satteri";
import type {
  Blockquote,
  Code,
  Image,
  Link,
  Paragraph,
  PhrasingContent,
  Strong,
  Text,
} from "mdast";
import type { MdastPluginDefinition } from "satteri";

import type { MediaCardData, MediaCardType } from "@/types/media";

type HProperties = Record<
  string,
  string | number | boolean | Array<string | number> | null | undefined
>;

const cardLang = /^card-(movie|tv|book|music)$/;
const stringFields = new Set([
  "id",
  "title",
  "release_date",
  "region",
  "genres",
  "overview",
  "poster",
  "source",
  "external_url",
  "author",
  "publisher",
  "isbn",
  "album",
  "url",
]);
const numberFields = new Set(["rating", "runtime", "pages", "duration"]);

function toNumber(value: string): number | undefined {
  if (!/^-?\d+(?:\.\d+)?$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseCardContent(content: string): MediaCardData | null {
  const data: Partial<MediaCardData> = {};

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const colonIndex = trimmed.indexOf(":");
    if (colonIndex <= 0) continue;

    const key = trimmed.slice(0, colonIndex).trim();
    const value = trimmed.slice(colonIndex + 1).trim();
    if (!key || !value) continue;

    if (stringFields.has(key)) {
      setStringField(data, key, value);
      continue;
    }

    if (numberFields.has(key)) {
      const numericValue = toNumber(value);
      if (numericValue !== undefined) {
        setNumberField(data, key, numericValue);
      }
    }
  }

  return typeof data.title === "string" && data.title
    ? { ...data, title: data.title }
    : null;
}

function setStringField(
  data: Partial<MediaCardData>,
  key: string,
  value: string
): void {
  switch (key) {
    case "id":
      data.id = value;
      break;
    case "title":
      data.title = value;
      break;
    case "release_date":
      data.release_date = value;
      break;
    case "region":
      data.region = value;
      break;
    case "genres":
      data.genres = value;
      break;
    case "overview":
      data.overview = value;
      break;
    case "poster":
      data.poster = value;
      break;
    case "source":
      data.source = value;
      break;
    case "external_url":
      data.external_url = value;
      break;
    case "author":
      data.author = value;
      break;
    case "publisher":
      data.publisher = value;
      break;
    case "isbn":
      data.isbn = value;
      break;
    case "album":
      data.album = value;
      break;
    case "url":
      data.url = value;
      break;
  }
}

function setNumberField(
  data: Partial<MediaCardData>,
  key: string,
  value: number
): void {
  switch (key) {
    case "rating":
      data.rating = value;
      break;
    case "runtime":
      data.runtime = value;
      break;
    case "pages":
      data.pages = value;
      break;
    case "duration":
      data.duration = value;
      break;
  }
}

function getCardUrl(
  cardType: MediaCardType,
  mediaData: MediaCardData
): string | undefined {
  if (cardType === "music" && mediaData.url) return mediaData.url;
  if (mediaData.external_url) return mediaData.external_url;

  if (!mediaData.id) return undefined;

  if (cardType === "tv") {
    const baseUrl =
      mediaData.source === "douban"
        ? "https://movie.douban.com/subject/"
        : "https://www.themoviedb.org/tv/";
    return `${baseUrl}${mediaData.id}`;
  }

  if (cardType === "book") {
    return `https://book.douban.com/subject/${mediaData.id}`;
  }

  const baseUrl =
    mediaData.source === "douban"
      ? "https://movie.douban.com/subject/"
      : "https://www.themoviedb.org/movie/";
  return `${baseUrl}${mediaData.id}`;
}

/**
 * Card fields are authored in Markdown and therefore must never be treated as
 * HTML.  Links are the one field where a dangerous protocol could otherwise
 * turn into an executable attribute.  Keep normal web/relative URLs and drop
 * everything else.
 */
function safeCardUrl(url: string | undefined): string | undefined {
  const candidate = url?.trim();
  if (!candidate || /^(?:javascript|vbscript|data):/i.test(candidate)) {
    return undefined;
  }

  if (
    candidate.startsWith("//") ||
    candidate.startsWith("/") ||
    candidate.startsWith("#")
  ) {
    return candidate;
  }

  try {
    const parsed = new URL(candidate);
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? candidate
      : undefined;
  } catch {
    // A non-absolute path is safe as long as it has no protocol-looking
    // prefix.  This covers relative links used by local fixtures.
    return /^[a-z][a-z\d+.-]*:/i.test(candidate) ? undefined : candidate;
  }
}

function text(value: string): Text {
  return { type: "text", value };
}

function taggedInline(
  tagName: string,
  value: string,
  hProperties: HProperties = {}
): Strong {
  return {
    type: "strong",
    data: { hName: tagName, hProperties },
    children: [text(value)],
  };
}

function taggedParagraph(
  tagName: string,
  children: PhrasingContent[],
  hProperties: HProperties = {}
): Paragraph {
  return {
    type: "paragraph",
    data: { hName: tagName, hProperties },
    children,
  };
}

function joinInline(parts: Array<string | undefined>): PhrasingContent[] {
  const children: PhrasingContent[] = [];
  for (const part of parts) {
    if (!part) continue;
    if (children.length) children.push(text(" · "));
    children.push(text(part));
  }
  return children;
}

function formatRuntime(minutes?: number): string | undefined {
  if (!minutes || minutes < 0) return undefined;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours ? `${hours}h ${mins}m` : `${mins}m`;
}

function formatDuration(seconds?: number): string | undefined {
  if (!seconds || seconds < 0) return undefined;
  const mins = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${rest
    .toString()
    .padStart(2, "0")}`;
}

function resolvePosterPath(
  poster: string | undefined,
  fileURL: URL | undefined
): string | undefined {
  if (!poster) return undefined;
  const candidate = poster.trim();
  if (
    !candidate ||
    /^(?:data|javascript|vbscript):/i.test(candidate) ||
    (/^[a-z][a-z\d+.-]*:/i.test(candidate) && !/^https?:\/\//i.test(candidate))
  ) {
    return undefined;
  }

  // Absolute and already-relative paths should retain the authored value.
  // Only the shorthand `attachments/foo.jpg` needs to be made relative to the
  // source file; this is the form emitted by the Obsidian media-card template.
  const normalized = candidate.replace(/\\/g, "/");
  const attachmentMatch = normalized.match(/^attachments\/(.+?)([?#].*)?$/i);
  if (!attachmentMatch || !fileURL) return candidate;
  if (fileURL.protocol !== "file:") return candidate;

  const sourcePath = fileURLToPath(fileURL);
  const sourceDirectory = path.dirname(sourcePath);
  const sourceParts = sourceDirectory.split(path.sep);
  const dataIndex = sourceParts.lastIndexOf("data");
  const fixtureMarker = ["blog", "posts", "snippets"]
    .map(marker => ({ marker, index: sourceParts.lastIndexOf(marker) }))
    .filter(({ index }) => index >= 0)
    .sort((left, right) => right.index - left.index)[0];
  const attachmentRootParts =
    dataIndex >= 0
      ? sourceParts.slice(0, dataIndex + 1)
      : fixtureMarker
        ? sourceParts.slice(0, fixtureMarker.index)
        : undefined;
  const dataDirectory = attachmentRootParts?.join(path.sep);
  if (!dataDirectory) return candidate;

  const attachmentPath = path.join(
    dataDirectory,
    "attachments",
    attachmentMatch[1]
  );
  const relative = path
    .relative(sourceDirectory, attachmentPath)
    .replace(/\\/g, "/");
  return `${relative || "."}${attachmentMatch[2] ?? ""}`;
}

function posterNode(
  poster: string | undefined,
  title: string,
  fileURL: URL | undefined
): Paragraph | undefined {
  const posterUrl = resolvePosterPath(poster, fileURL);
  if (!posterUrl) return undefined;

  const image: Image = {
    type: "image",
    url: posterUrl,
    alt: title,
    data: {
      hProperties: {
        className: ["media-card__poster"],
        loading: "lazy",
        decoding: "async",
      },
    },
  };
  return taggedParagraph("div", [image], {
    className: ["media-card__poster-wrap"],
  });
}

function toMediaCardNode(
  cardType: MediaCardType,
  mediaData: MediaCardData,
  fileURL: URL | undefined
): Blockquote {
  const cardUrl = safeCardUrl(getCardUrl(cardType, mediaData));
  const titleLink: Link | undefined = cardUrl
    ? {
        type: "link",
        url: cardUrl,
        data: {
          hProperties: {
            target: "_blank",
            rel: "noopener noreferrer",
            className: ["media-card__title-link"],
          },
        },
        children: [text(mediaData.title)],
      }
    : undefined;
  const titleContent = titleLink ? [titleLink] : [text(mediaData.title)];

  const metadata: PhrasingContent[] = [];
  if (cardType === "music") {
    metadata.push(
      ...joinInline([
        mediaData.author,
        mediaData.album,
        formatDuration(mediaData.duration),
      ])
    );
  } else {
    metadata.push(
      ...joinInline([
        mediaData.release_date,
        cardType === "book" ? mediaData.author : mediaData.region,
        formatRuntime(mediaData.runtime),
      ])
    );
  }

  const cardChildren: Array<Paragraph | Blockquote> = [];
  const bodyChildren: Array<Paragraph | Blockquote> = [];
  const poster = posterNode(mediaData.poster, mediaData.title, fileURL);
  if (poster) bodyChildren.push(poster);

  bodyChildren.push(
    taggedParagraph("div", titleContent, {
      className: ["media-card__title"],
      role: "heading",
      ariaLevel: 3,
    })
  );

  if (metadata.length) {
    bodyChildren.push(
      taggedParagraph("div", metadata, {
        className: ["media-card__meta"],
      })
    );
  }

  if (mediaData.rating !== undefined && mediaData.rating > 0) {
    bodyChildren.push(
      taggedParagraph(
        "div",
        [
          taggedInline("span", `评分 ${mediaData.rating.toFixed(1)}/10`, {
            className: ["media-card__rating"],
            ariaLabel: `评分 ${mediaData.rating.toFixed(1)} 分（满分 10 分）`,
          }),
        ],
        { className: ["media-card__rating-row"] }
      )
    );
  }

  if (mediaData.genres) {
    const genres = mediaData.genres
      .split(/[,，]/)
      .map(genre => genre.trim())
      .filter(Boolean)
      .map(genre =>
        taggedInline("span", genre, { className: ["media-card__genre"] })
      );
    if (genres.length) {
      bodyChildren.push(
        taggedParagraph("div", genres, {
          className: ["media-card__genres"],
        })
      );
    }
  }

  if (mediaData.overview) {
    bodyChildren.push(
      taggedParagraph("p", [text(mediaData.overview)], {
        className: ["media-card__overview"],
      })
    );
  }

  cardChildren.push({
    type: "blockquote",
    data: {
      hName: "div",
      hProperties: {
        className: [
          "media-card__body",
          ...(poster ? [] : ["media-card__body--no-poster"]),
        ],
        "data-has-poster": poster ? "true" : "false",
      },
    },
    children: bodyChildren,
  });

  return {
    type: "blockquote",
    data: {
      hName: "article",
      hProperties: {
        className: ["media-card", "media-card--static"],
        "data-media-type": cardType,
        ariaLabel: mediaData.title,
      },
    },
    children: cardChildren,
  };
}

function getDisplayText(
  cardType: MediaCardType,
  mediaData: MediaCardData
): string {
  switch (cardType) {
    case "book":
      return `书籍：《${mediaData.title}》`;
    case "movie":
      return `电影：《${mediaData.title}》`;
    case "tv":
      return `剧集：《${mediaData.title}》`;
    case "music":
      return `音乐：《${mediaData.title}》`;
    default:
      return `《${mediaData.title}》`;
  }
}

function toRssLinkNode(
  cardType: MediaCardType,
  mediaData: MediaCardData
): Paragraph {
  const linkText = getDisplayText(cardType, mediaData);
  const cardUrl = safeCardUrl(getCardUrl(cardType, mediaData));
  if (!cardUrl) {
    return {
      type: "paragraph",
      children: [text(linkText)],
    };
  }

  const link: Link = {
    type: "link",
    url: cardUrl,
    title: linkText,
    data: {
      hProperties: {
        target: "_blank",
        rel: "noopener noreferrer",
      },
    },
    children: [text(linkText)],
  };

  return {
    type: "paragraph",
    children: [link],
  };
}

export interface MediaCardPluginOptions {
  output: "card" | "link";
}

export function createMediaCardPlugin({
  output,
}: MediaCardPluginOptions): MdastPluginDefinition {
  return defineMdastPlugin({
    name: `media-card-${output}`,
    code(node: Readonly<Code>, ctx) {
      const matched = node.lang?.match(cardLang);
      if (!matched) return;

      const cardType = matched[1] as MediaCardType;
      const mediaData = parseCardContent(node.value);
      // Keep malformed cards as code blocks so an author can discover and fix
      // the source instead of losing content during a build.
      if (!mediaData) return;

      ctx.replaceNode(
        node,
        output === "card"
          ? toMediaCardNode(cardType, mediaData, ctx.fileURL)
          : toRssLinkNode(cardType, mediaData)
      );
    },
  });
}

// Backwards-compatible page plugin export for callers outside processor.ts.
export const mediaCardPlugin = createMediaCardPlugin({ output: "card" });
