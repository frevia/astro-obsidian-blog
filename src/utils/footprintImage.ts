const MARKDOWN_IMAGE = /!\[[^\]]*\]\(\s*<?([^\s)>]+)>?(?:\s+[^)]*)?\)/;
const WIKILINK_IMAGE = /!\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/;

export function firstContentImage(body?: string): string | undefined {
  if (!body) return undefined;

  const markdownMatch = body.match(MARKDOWN_IMAGE)?.[1]?.trim();
  if (markdownMatch) return markdownMatch;

  return body.match(WIKILINK_IMAGE)?.[1]?.trim() || undefined;
}
