import { withBase } from "./withBase";
import { slug as slugSegment } from "github-slugger";

/** Remove the generated collection extension while keeping the folder path. */
export function wikiRouteId(id: string): string {
  return id
    .replace(/\\/g, "/")
    .replace(/\.(?:md|mdx)$/i, "")
    .split("/")
    .filter(segment => segment && segment !== "." && segment !== "..")
    .map(segment => slugSegment(segment))
    .join("/");
}

/** Stable public URL for a generated wiki collection entry. */
export function getWikiPath(
  id: string,
  includeBase = true,
  base?: string
): string {
  const routeId = wikiRouteId(id);
  const path = routeId ? `/wiki/${routeId}` : "/wiki";
  return includeBase ? withBase(path, base) : path;
}

/** Prefer explicit frontmatter, then the first Markdown H1, then the id. */
export function getWikiTitle(entry: {
  id: string;
  body?: string;
  data: { title?: string | null };
}): string {
  const explicitTitle = entry.data.title?.trim();
  if (explicitTitle) return explicitTitle;

  const heading = entry.body?.match(/^\s*#\s+(.+?)\s*#*\s*$/m)?.[1]?.trim();
  if (heading) return heading;

  const fallback = entry.id
    .replace(/\\/g, "/")
    .split("/")
    .pop()
    ?.replace(/\.(?:md|mdx)$/i, "");
  return fallback || "Wiki";
}

/** Keep an index/HTML meta description short without requiring blog fields. */
export function getWikiDescription(entry: {
  body?: string;
  data: { description?: string | null; summary?: string | null };
}): string {
  const toPlainText = (value: string): string =>
    value
      .replace(/!\[\[[^\]]+\]\]/g, "")
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
      .replace(/\[\[([^\]]+)\]\]/g, (_match, raw: string) => {
        const [targetWithHeading, alias] = raw.split("|");
        if (alias?.trim()) return alias.trim();

        const target = targetWithHeading.split("#")[0].replace(/\\/g, "/");
        return target.split("/").pop()?.trim() || "";
      })
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/<[^>]+>/g, " ")
      .replace(/^\s*(?:#{1,6}|>|[-*+] |\d+\. )\s*/gm, "")
      .replace(/[`*_~]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const explicit = entry.data.description?.trim() || entry.data.summary?.trim();
  if (explicit) return toPlainText(explicit).slice(0, 180);

  const firstParagraph = (entry.body ?? "")
    .replace(/^\s*#.*$/gm, "")
    .split(/\n\s*\n/)
    .map(toPlainText)
    .find(Boolean);
  return firstParagraph?.slice(0, 180) || "持续更新的知识页";
}
