const defaultBase = import.meta.env?.BASE_URL ?? "/";
const uriSchemePattern = /^[a-z][a-z\d+\-.]*:/i;
const protocolRelativePattern = /^\/\//;
const queryOrFragmentPattern = /^[?#]/;

function shouldLeavePathUnchanged(path: string): boolean {
  return (
    uriSchemePattern.test(path) ||
    protocolRelativePattern.test(path) ||
    queryOrFragmentPattern.test(path)
  );
}

function normalizeBase(base: string): string {
  const normalized = `/${base}`.replace(/\/+/g, "/").replace(/\/+$/, "");
  return normalized === "" ? "/" : normalized;
}

function splitPath(path: string): {
  pathname: string;
  suffix: string;
} {
  const suffixIndex = path.search(/[?#]/);
  if (suffixIndex === -1) {
    return { pathname: path, suffix: "" };
  }
  return {
    pathname: path.slice(0, suffixIndex),
    suffix: path.slice(suffixIndex),
  };
}

function normalizePathname(pathname: string): string {
  const normalized = `/${pathname}`.replace(/\/+/g, "/");
  return normalized === "" ? "/" : normalized;
}

/**
 * Strip the configured Astro `base` prefix from an absolute pathname.
 * Returns a root-relative pathname.
 */
export function stripBase(path: string, base = defaultBase): string {
  if (shouldLeavePathUnchanged(path)) {
    return path;
  }

  const normalizedBase = normalizeBase(base);
  if (normalizedBase === "/") {
    return path;
  }

  const { pathname, suffix } = splitPath(path);
  const normalizedPathname = normalizePathname(pathname);

  if (normalizedPathname === normalizedBase) {
    return `/${suffix}`;
  }

  const basePrefix = `${normalizedBase}/`;
  if (normalizedPathname.startsWith(basePrefix)) {
    return `${normalizedPathname.slice(normalizedBase.length)}${suffix}`;
  }

  return path;
}

/**
 * Prefix a site-relative path with the configured Astro `base`.
 * External URLs and already-prefixed paths are returned unchanged.
 */
export function withBase(path: string, base = defaultBase): string {
  if (shouldLeavePathUnchanged(path)) {
    return path;
  }

  const normalizedBase = normalizeBase(base);
  const { pathname, suffix } = splitPath(path);
  const normalizedPathname = normalizePathname(pathname);

  if (normalizedBase === "/") {
    return `${normalizedPathname}${suffix}`;
  }

  if (
    normalizedPathname === normalizedBase ||
    normalizedPathname.startsWith(`${normalizedBase}/`)
  ) {
    return `${normalizedPathname}${suffix}`;
  }

  if (normalizedPathname === "/") {
    return `${normalizedBase}${suffix}`;
  }

  return `${normalizedBase}${normalizedPathname}${suffix}`;
}

/** Prefix an asset/file path with the configured Astro `base`. */
export const getAssetPath = withBase;
