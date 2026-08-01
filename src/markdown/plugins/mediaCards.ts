import { defineMdastPlugin } from "satteri";
import type { Code, Link, Paragraph } from "mdast";
import type { MdastPluginDefinition } from "satteri";

import type { MediaCardData, MediaCardType } from "@/types/media";

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

function getCardUrl(cardType: MediaCardType, mediaData: MediaCardData): string {
  if (cardType === "music" && mediaData.url) return mediaData.url;
  if (mediaData.external_url) return mediaData.external_url;

  if (!mediaData.id) return "#";

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
  const link: Link = {
    type: "link",
    url: getCardUrl(cardType, mediaData),
    title: linkText,
    data: {
      hProperties: {
        target: "_blank",
        rel: "noopener noreferrer",
      },
    },
    children: [{ type: "text", value: linkText }],
  };

  return {
    type: "paragraph",
    children: [link],
  };
}

export const mediaCardPlugin: MdastPluginDefinition = defineMdastPlugin({
  name: "media-card",
  code(node: Readonly<Code>, ctx) {
    const matched = node.lang?.match(cardLang);
    if (!matched) return;

    const cardType = matched[1] as MediaCardType;
    const mediaData = parseCardContent(node.value);
    if (!mediaData) return;

    if (ctx.sourceFormat === "mdx") {
      ctx.replaceNode(node, {
        type: "mdxJsxFlowElement",
        name: "MediaCard",
        attributes: [
          {
            type: "mdxJsxAttribute",
            name: "cardType",
            value: cardType,
          },
          {
            type: "mdxJsxAttribute",
            name: "mediaData",
            value: JSON.stringify(mediaData),
          },
        ],
        children: [],
      });
      return;
    }

    ctx.replaceNode(node, toRssLinkNode(cardType, mediaData));
  },
});
