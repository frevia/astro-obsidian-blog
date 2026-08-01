import { fileURLToPath } from "node:url";

import { defineMdastPlugin } from "satteri";
import type { Image, Link } from "mdast";
import type { MdastPluginDefinition } from "satteri";

import { processLink } from "@/utils/linkProcessor";
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
      const targetPathname = /\.[^/]+$/.test(pathname)
        ? pathname
        : `${pathname}.md`;
      const target = hash ? `${targetPathname}#${hash}` : targetPathname;
      const processedUrl = processLink(target, currentFilePath(ctx.fileURL));
      const resolvedUrl =
        processedUrl === node.url || processedUrl === target
          ? node.url.startsWith("/")
            ? node.url
            : undefined
          : processedUrl;
      if (!resolvedUrl) return;

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
