export type ArticleCoverSource =
  | string
  | { src?: string | null }
  | null
  | undefined;

export type LocalCoverResolver = (
  relativePath: string
) => Promise<string | undefined>;

const URL_SCHEME = /^[a-z][a-z\d+.-]*:/i;

export async function resolveArticleCoverUrl(
  source: ArticleCoverSource,
  resolveLocal: LocalCoverResolver
): Promise<string | undefined> {
  if (!source) return undefined;

  if (typeof source !== "string") {
    const src = source.src?.trim();
    return src || undefined;
  }

  const value = source.trim();
  if (!value) return undefined;

  if (
    value.startsWith("/") ||
    value.startsWith("//") ||
    URL_SCHEME.test(value)
  ) {
    return value;
  }

  return resolveLocal(value);
}
