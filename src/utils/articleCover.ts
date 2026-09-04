export type ArticleCoverSource =
  | string
  | { src?: string | null }
  | null
  | undefined;

export type LocalCoverResolver = (
  relativePath: string
) => Promise<string | undefined>;

const URL_SCHEME = /^[a-z][a-z\d+.-]*:/i;

const toAbsoluteUrl = (value: string, origin: string) =>
  new URL(value, origin).href;

export async function resolveArticleCoverUrl(
  source: ArticleCoverSource,
  origin: string,
  resolveLocal: LocalCoverResolver
): Promise<string | undefined> {
  if (!source) return undefined;

  if (typeof source !== "string") {
    const src = source.src?.trim();
    return src ? toAbsoluteUrl(src, origin) : undefined;
  }

  const value = source.trim();
  if (!value) return undefined;

  if (
    value.startsWith("/") ||
    value.startsWith("//") ||
    URL_SCHEME.test(value)
  ) {
    return toAbsoluteUrl(value, origin);
  }

  const localAssetUrl = await resolveLocal(value);
  return localAssetUrl ? toAbsoluteUrl(localAssetUrl, origin) : undefined;
}
