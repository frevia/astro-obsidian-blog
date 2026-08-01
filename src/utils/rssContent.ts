import * as cheerio from "cheerio";

import { renderRssMarkdown } from "@/markdown/processor";
import { stripBase, withBase } from "./withBase";

type CheerioSelection = ReturnType<ReturnType<typeof cheerio.load>>;

type UrlAttributeContext = {
  tagName: string;
  attrName: string;
};

export interface RssImageInfo {
  thumbnail: string;
  width: number;
  height: number;
}

export type RssImageOptimizer = (
  imagePath: string,
  options: { thumbnailSize: number }
) => Promise<RssImageInfo>;

export interface RssHtmlOptions {
  site: string;
  base?: string;
  optimizeImage?: RssImageOptimizer;
}

export interface RenderRssContentInput {
  renderedHtml?: string;
  markdown?: string;
}

export interface RenderRssContentOptions extends RssHtmlOptions {
  fileURL?: URL;
  renderMarkdown?: typeof renderRssMarkdown;
}

const singleUrlAttributes = new Set([
  "href",
  "src",
  "xlink:href",
  "poster",
  "action",
  "formaction",
]);
const srcsetAttributes = new Set(["srcset"]);
const blockedElements = new Set([
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "form",
  "meta",
  "svg",
  "link",
  "base",
  "input",
  "button",
  "select",
  "textarea",
  "video",
  "audio",
  "source",
  "canvas",
  "frame",
  "frameset",
]);
const allowedElements = new Set([
  "a",
  "abbr",
  "annotation",
  "article",
  "aside",
  "b",
  "blockquote",
  "br",
  "cite",
  "code",
  "dd",
  "del",
  "details",
  "dfn",
  "div",
  "dl",
  "dt",
  "em",
  "figcaption",
  "figure",
  "footer",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hr",
  "i",
  "img",
  "ins",
  "kbd",
  "li",
  "main",
  "mark",
  "math",
  "menclose",
  "mfrac",
  "mi",
  "mmultiscripts",
  "mn",
  "mo",
  "mover",
  "mpadded",
  "mphantom",
  "mroot",
  "mrow",
  "ms",
  "mspace",
  "msqrt",
  "mstyle",
  "msub",
  "msubsup",
  "msup",
  "mtable",
  "mtd",
  "mtext",
  "mtr",
  "munder",
  "munderover",
  "ol",
  "p",
  "pre",
  "q",
  "s",
  "samp",
  "section",
  "semantics",
  "small",
  "span",
  "strong",
  "sub",
  "summary",
  "sup",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "time",
  "tr",
  "u",
  "ul",
  "var",
]);
const mathMlElements = new Set([
  "annotation",
  "math",
  "menclose",
  "mfrac",
  "mi",
  "mmultiscripts",
  "mn",
  "mo",
  "mover",
  "mpadded",
  "mphantom",
  "mroot",
  "mrow",
  "ms",
  "mspace",
  "msqrt",
  "mstyle",
  "msub",
  "msubsup",
  "msup",
  "mtable",
  "mtd",
  "mtext",
  "mtr",
  "munder",
  "munderover",
  "semantics",
]);
const mathMlAttributes = new Set([
  "accent",
  "accentunder",
  "align",
  "class",
  "columnalign",
  "columnspan",
  "depth",
  "display",
  "encoding",
  "fence",
  "height",
  "linethickness",
  "lspace",
  "mathbackground",
  "mathcolor",
  "mathsize",
  "mathvariant",
  "notation",
  "rowalign",
  "rowspan",
  "rspace",
  "scriptlevel",
  "separator",
  "stretchy",
  "width",
  "xmlns",
]);
const globalAttributes = new Set(["aria-label", "aria-hidden", "title"]);
const allowedAttributesByElement = new Map<string, Set<string>>([
  ["a", new Set(["href", "rel", "target", "title", "aria-label"])],
  ["abbr", new Set(["title", "aria-label"])],
  [
    "img",
    new Set(["src", "srcset", "alt", "width", "height", "title", "aria-label"]),
  ],
  ["ol", new Set(["start", "type", "aria-label"])],
  ["li", new Set(["value", "aria-label"])],
  ["pre", new Set(["class", "data-language", "aria-label"])],
  ["code", new Set(["class", "aria-label"])],
  ["span", new Set(["class", "aria-label", "aria-hidden"])],
  ["time", new Set(["datetime", "title", "aria-label"])],
  ["td", new Set(["colspan", "rowspan", "headers", "aria-label"])],
  ["th", new Set(["colspan", "rowspan", "scope", "headers", "aria-label"])],
]);
const dangerousSchemePattern = /^(?:javascript|vbscript):/i;
const safeSpecialUrlPattern = /^(?:[a-z][a-z\d+\-.]*:|\/\/|#)/i;
const schemePattern = /^([a-z][a-z\d+\-.]*):/i;

function normalizeSchemeCandidate(value: string): string {
  return value.replace(/[\u0000-\u001F\u007F\s]+/g, "").trim();
}

function isDangerousUrl(value: string): boolean {
  return dangerousSchemePattern.test(normalizeSchemeCandidate(value));
}

function isSafeSpecialUrl(value: string): boolean {
  return safeSpecialUrlPattern.test(value.trim());
}

function isAllowedAttribute(tagName: string, attrName: string): boolean {
  const lowerAttr = attrName.toLowerCase();
  if (lowerAttr.startsWith("on")) return false;
  if (mathMlElements.has(tagName) && mathMlAttributes.has(lowerAttr)) {
    return true;
  }
  if (globalAttributes.has(lowerAttr)) return true;
  return allowedAttributesByElement.get(tagName)?.has(lowerAttr) ?? false;
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

function isProtocolRelativeUrl(value: string): boolean {
  return value.trim().startsWith("//");
}

function isRelativeUrl(value: string): boolean {
  const trimmed = value.trim();
  return (
    trimmed !== "" &&
    !schemePattern.test(trimmed) &&
    !isProtocolRelativeUrl(trimmed)
  );
}

function decodeHtmlAttribute(value: string): string {
  return value
    .replace(/&#x22;/gi, '"')
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function normalizePathForSite(value: string, base = "/"): string {
  const stripped = stripBase(value, base);
  return withBase(stripped, base);
}

export function toAbsoluteRssUrl(
  value: string,
  site: string,
  base = "/"
): string {
  const trimmed = value.trim();
  if (trimmed === "" || isSafeSpecialUrl(trimmed)) {
    return value;
  }

  return new URL(normalizePathForSite(trimmed, base), site).href;
}

function sanitizeSingleUrl(
  value: string,
  context: UrlAttributeContext,
  options: RssHtmlOptions
): string | undefined {
  const trimmed = value.trim();
  if (trimmed === "" || isDangerousUrl(trimmed)) return undefined;

  if (isHttpUrl(trimmed) || isProtocolRelativeUrl(trimmed)) return trimmed;
  if (
    context.tagName === "img" &&
    context.attrName === "src" &&
    /^data:image\//i.test(trimmed)
  ) {
    return trimmed;
  }
  if (schemePattern.test(trimmed)) return undefined;
  if (isRelativeUrl(trimmed)) {
    return toAbsoluteRssUrl(trimmed, options.site, options.base);
  }

  return undefined;
}

function sanitizeSrcset(
  value: string,
  context: UrlAttributeContext,
  options: RssHtmlOptions
): string | undefined {
  const candidates: string[] = [];
  let index = 0;

  while (index < value.length) {
    while (/[\s,]/.test(value[index] ?? "")) index += 1;
    if (index >= value.length) break;

    const urlStart = index;
    const isDataCandidate = /^data:/i.test(value.slice(index));
    while (
      index < value.length &&
      !/\s/.test(value[index]) &&
      (isDataCandidate || value[index] !== ",")
    ) {
      index += 1;
    }
    const url = value.slice(urlStart, index);

    const descriptorStart = index;
    while (index < value.length && value[index] !== ",") index += 1;
    const descriptors = value.slice(descriptorStart, index).trim();

    const sanitized = sanitizeSingleUrl(
      url,
      { ...context, attrName: "src" },
      options
    );
    if (sanitized && !/^data:/i.test(url)) {
      candidates.push([sanitized, descriptors].filter(Boolean).join(" "));
    }
  }

  return candidates.length > 0 ? candidates.join(", ") : undefined;
}

function sanitizeUrlAttribute(
  value: string,
  context: UrlAttributeContext,
  options: RssHtmlOptions
): string | undefined {
  if (srcsetAttributes.has(context.attrName)) {
    return sanitizeSrcset(value, context, options);
  }

  return sanitizeSingleUrl(value, context, options);
}

function readAstroImageData(img: CheerioSelection):
  | {
      src: string;
      alt: string;
    }
  | undefined {
  const raw = img.attr("__astro_image_");
  if (!raw) return undefined;

  try {
    const parsed = JSON.parse(decodeHtmlAttribute(raw)) as {
      src?: unknown;
      alt?: unknown;
    };
    if (typeof parsed.src !== "string" || parsed.src.trim() === "") {
      return undefined;
    }

    return {
      src: parsed.src,
      alt: typeof parsed.alt === "string" ? parsed.alt : img.attr("alt") || "",
    };
  } catch {
    return undefined;
  }
}

async function normalizeImage(
  img: CheerioSelection,
  options: RssHtmlOptions
): Promise<void> {
  const astroImage = readAstroImageData(img);
  const source = astroImage?.src ?? img.attr("src");
  if (!source || isDangerousUrl(source)) {
    if (source && isDangerousUrl(source)) img.removeAttr("src");
    img.removeAttr("__astro_image_");
    return;
  }

  let imageUrl = source;
  let dimensions: Pick<RssImageInfo, "width" | "height"> | undefined;

  if (
    options.optimizeImage &&
    source.includes("attachment") &&
    isRelativeUrl(source)
  ) {
    try {
      const optimized = await options.optimizeImage(source, {
        thumbnailSize: 900,
      });
      imageUrl = optimized.thumbnail || source;
      dimensions = optimized;
    } catch {
      imageUrl = source;
    }
  }

  img.attr("src", toAbsoluteRssUrl(imageUrl, options.site, options.base));
  if (astroImage) img.attr("alt", astroImage.alt);
  if (dimensions) {
    img.attr("width", dimensions.width.toString());
    img.attr("height", dimensions.height.toString());
  }
  img.removeAttr("__astro_image_");
}

export async function normalizeRssHtml(
  html: string,
  options: RssHtmlOptions
): Promise<string> {
  if (!html) return html;

  const $ = cheerio.load(html, null, false);

  $("*").each((_, element) => {
    const node = $(element);
    const tagName = String(node.prop("tagName") ?? "").toLowerCase();
    if (!tagName) return;

    if (blockedElements.has(tagName)) {
      node.remove();
      return;
    }

    if (!allowedElements.has(tagName)) {
      node.replaceWith(node.contents());
    }
  });

  const images = $("img").toArray();
  for (const image of images) {
    await normalizeImage($(image), options);
  }

  $("*").each((_, element) => {
    const node = $(element);
    const tagName = String(node.prop("tagName") ?? "").toLowerCase();
    if (!tagName) return;

    const attributes = node.attr() ?? {};

    for (const attr of Object.keys(attributes)) {
      const lowerAttr = attr.toLowerCase();

      if (!isAllowedAttribute(tagName, lowerAttr)) {
        node.removeAttr(attr);
        continue;
      }

      if (
        singleUrlAttributes.has(lowerAttr) ||
        srcsetAttributes.has(lowerAttr)
      ) {
        const value = node.attr(attr);
        if (!value) continue;
        const sanitized = sanitizeUrlAttribute(
          value,
          { tagName, attrName: lowerAttr },
          options
        );
        if (sanitized) {
          node.attr(attr, sanitized);
        } else {
          node.removeAttr(attr);
        }
      }
    }
  });

  $("h1, h2, h3, h4, h5, h6").each((_, heading) => {
    $(heading).find('a[href^="#"]').remove();
  });

  return $.html();
}

export async function renderRssContent(
  input: RenderRssContentInput,
  options: RenderRssContentOptions
): Promise<string> {
  const html =
    input.renderedHtml ??
    (await (options.renderMarkdown ?? renderRssMarkdown)(input.markdown ?? "", {
      fileURL: options.fileURL,
    }));

  return normalizeRssHtml(html, options);
}
