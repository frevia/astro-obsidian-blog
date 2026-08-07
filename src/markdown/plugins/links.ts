import { fileURLToPath } from "node:url";
import path from "node:path";

import { defineMdastPlugin } from "satteri";
import type { Image, Link } from "mdast";
import type { MdastPluginDefinition } from "satteri";

import { processLink } from "@/utils/linkProcessor";
import { WIKI_PATH } from "@/config";
import { withBase } from "@/utils/withBase";

const imageExt = /\.(png|jpe?g|gif|webp|svg|avif)$/i;

function currentFilePath(fileURL: URL | undefined): string | undefined {
  return fileURL ? fileURLToPath(fileURL) : undefined;
}

function defaultAlt(url: string): string {
  const normalized = url.replace(/\\/g, "/");
  const filename = normalized.split("/").filter(Boolean).pop() ?? normalized;
  return filename.replace(/\.[^.]+$/, "");
}

function shouldSkipLink(url: string): boolean {
  return /^(?:https?:)?\/\//.test(url) || /^(?:#|mailto:|tel:)/.test(url);
}

function splitHash(url: string): [string, string] {
  const hashIndex = url.indexOf("#");
  if (hashIndex === -1) return [url, ""];
  return [url.slice(0, hashIndex), url.slice(hashIndex + 1)];
}

function isWikilinkSource(
  node: Readonly<Link>,
  source: string | undefined
): boolean {
  const start = node.position?.start.offset;
  const end = node.position?.end.offset;
  if (typeof start !== "number" || typeof end !== "number" || !source) {
    return false;
  }

  return source.slice(start, end).trimStart().startsWith("[[");
}

function isWikiSourceFile(fileURL: URL | undefined): boolean {
  if (!fileURL) return false;
  const filePath = fileURLToPath(fileURL).replace(/\\/g, "/");
  const wikiDirectory = path
    .resolve(process.cwd(), WIKI_PATH)
    .replace(/\\/g, "/");
  const relative = path.posix.relative(wikiDirectory, filePath);
  return (
    relative === "" || (!relative.startsWith("..") && !relative.startsWith("/"))
  );
}

interface LinkProcessorOptions {
  includeBase?: boolean;
  base?: string;
}

export function createLinkProcessorPlugin({
  includeBase = true,
  base,
}: LinkProcessorOptions = {}): MdastPluginDefinition {
  return defineMdastPlugin({
    name: includeBase ? "link-processor" : "link-processor-rss",
    link(node: Readonly<Link>, ctx) {
      if (shouldSkipLink(node.url)) return;

      const [pathname, hash] = splitHash(node.url);
      const target = hash ? `${pathname}#${hash}` : pathname;
      const processedUrl = processLink(target, currentFilePath(ctx.fileURL));
      const resolvedUrl =
        processedUrl === node.url || processedUrl === target
          ? node.url.startsWith("/")
            ? node.url
            : undefined
          : processedUrl;
      if (!resolvedUrl) {
        // Unknown wikilinks are private/invalid by definition in the public
        // build. Replace the generated anchor with an empty span so neither a
        // relative URL nor the private target label becomes discoverable.
        if (
          isWikilinkSource(node, ctx.source) ||
          isWikiSourceFile(ctx.fileURL)
        ) {
          ctx.removeNode(node);
          return;
        }

        // A relative Markdown link is only public after processLink resolves
        // it to a known collection. Keep its label, but fail closed instead
        // of emitting a path that could resolve to an unexported note.
        if (!node.url.startsWith("/")) {
          ctx.setProperty(node, "url", "#");
        }
        return;
      }

      ctx.setProperty(
        node,
        "url",
        includeBase ? withBase(resolvedUrl, base) : resolvedUrl
      );
      if (resolvedUrl.startsWith("/posts/")) {
        ctx.setProperty(node, "data", {
          ...node.data,
          hProperties: {
            ...((node.data?.hProperties as Record<string, unknown>) ?? {}),
            target: "_blank",
            rel: "noopener noreferrer",
          },
        });
      }
    },
    image(node: Readonly<Image>, ctx) {
      if (!imageExt.test(node.url)) return;

      if (!node.alt || node.alt === node.url) {
        ctx.setProperty(node, "alt", defaultAlt(node.url));
      }
    },
  });
}

export const linkProcessorPlugin = createLinkProcessorPlugin();
export const rssLinkProcessorPlugin = createLinkProcessorPlugin({
  includeBase: false,
});
