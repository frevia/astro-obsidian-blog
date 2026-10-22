export interface CommentPage {
  title: string;
  href: string;
  anchor?: string;
}

export type CommentCatalog = Record<string, CommentPage>;

const commentIdPattern = /^[A-Za-z0-9_-]{1,128}$/;
const httpUrlPattern = /^https?:\/\/[^/\\?#]/i;
const controlCharacterPattern = /[\u0000-\u001f\u007f]/;

function isCommentId(value: unknown): value is string {
  return typeof value === "string" && commentIdPattern.test(value);
}

function withoutTrailingSlash(path: string): string {
  if (path === "/") return "/";
  return path.replace(/\/+$/, "") || "/";
}

function decodeSafely(value: string): string | null {
  try {
    const decoded = decodeURIComponent(value);
    if (controlCharacterPattern.test(decoded) || decoded.includes("\\")) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

function isRootPath(path: unknown): path is string {
  if (
    typeof path !== "string" ||
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.includes("\\") ||
    path.includes("?") ||
    path.includes("#") ||
    controlCharacterPattern.test(path)
  ) {
    return false;
  }

  const decoded = decodeSafely(path);
  return Boolean(
    decoded &&
      !decoded.startsWith("//") &&
      !decoded.includes("?") &&
      !decoded.includes("#")
  );
}

function parseSiteUrl(siteUrl: string): URL | null {
  if (
    typeof siteUrl !== "string" ||
    !siteUrl ||
    siteUrl.includes("\\") ||
    controlCharacterPattern.test(siteUrl)
  ) {
    return null;
  }

  try {
    const url = new URL(siteUrl);
    if (
      !httpUrlPattern.test(url.href) ||
      url.username ||
      url.password ||
      url.origin === "null"
    ) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

function parseSourceUrl(rawUrl: string, siteUrl: URL): URL | null {
  if (
    typeof rawUrl !== "string" ||
    !rawUrl ||
    rawUrl.includes("\\") ||
    controlCharacterPattern.test(rawUrl)
  ) {
    return null;
  }

  const isRootRelative = rawUrl.startsWith("/") && !rawUrl.startsWith("//");
  const isAbsolute = httpUrlPattern.test(rawUrl);
  if (!isRootRelative && !isAbsolute) return null;

  try {
    const url = isRootRelative ? new URL(rawUrl, siteUrl) : new URL(rawUrl);
    if (
      url.origin !== siteUrl.origin ||
      url.username ||
      url.password ||
      !isRootPath(url.pathname) ||
      decodeSafely(url.search) === null ||
      decodeSafely(url.hash) === null
    ) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

function appendCommentTarget(
  page: CommentPage,
  id: string,
  pathname: string,
  siteUrl: URL
): { href: string; title: string } | null {
  if (
    typeof page?.title !== "string" ||
    typeof page.href !== "string" ||
    !page.href.startsWith("/") ||
    page.href.startsWith("//") ||
    page.href.includes("\\") ||
    (page.anchor !== undefined && typeof page.anchor !== "string")
  ) {
    return null;
  }

  try {
    const href = new URL(page.href, siteUrl);
    if (href.origin !== siteUrl.origin || !isRootPath(href.pathname)) {
      return null;
    }
    if (
      decodeSafely(href.search) === null ||
      decodeSafely(href.hash) === null
    ) {
      return null;
    }

    href.searchParams.set("comment", id);
    href.searchParams.set("thread", pathname);
    href.hash = `#${page.anchor || id}`;

    return {
      href: `${href.pathname}${href.search}${href.hash}`,
      title: page.title,
    };
  } catch {
    return null;
  }
}

export function commentDestination(
  rawUrl: string,
  id: string,
  catalog: CommentCatalog,
  siteUrl: string
): { href: string; title: string } | null {
  if (!isCommentId(id) || !catalog || typeof catalog !== "object") return null;

  const site = parseSiteUrl(siteUrl);
  if (!site) return null;

  const source = parseSourceUrl(rawUrl, site);
  if (!source) return null;

  const key = withoutTrailingSlash(source.pathname);
  if (!Object.prototype.hasOwnProperty.call(catalog, key)) return null;

  return appendCommentTarget(catalog[key], id, source.pathname, site);
}

function parseSearch(search: string): URLSearchParams | null {
  if (
    typeof search !== "string" ||
    search.includes("\\") ||
    controlCharacterPattern.test(search)
  ) {
    return null;
  }

  const query = search.startsWith("?") ? search.slice(1) : search;
  if (decodeSafely(query) === null) return null;
  return new URLSearchParams(query);
}

function parseHash(hash: string): string | null {
  if (
    typeof hash !== "string" ||
    hash.includes("\\") ||
    controlCharacterPattern.test(hash)
  ) {
    return null;
  }

  const fragment = hash.startsWith("#") ? hash.slice(1) : hash;
  return isCommentId(fragment) ? fragment : null;
}

export function readCommentTarget(
  path: string,
  search: string,
  hash: string
): { id: string; path: string } | null {
  if (!isRootPath(path)) return null;

  const params = parseSearch(search);
  if (!params) return null;

  const comments = params.getAll("comment");
  const threads = params.getAll("thread");
  if (comments.length > 1 || threads.length > 1) return null;

  const thread = threads[0];
  if (
    thread !== undefined &&
    (!isRootPath(thread) ||
      withoutTrailingSlash(thread) !== withoutTrailingSlash(path))
  ) {
    return null;
  }

  const comment = comments[0];
  if (comment !== undefined) {
    return isCommentId(comment) ? { id: comment, path: thread ?? path } : null;
  }

  const fragment = parseHash(hash);
  if (!fragment || /^date-\d{4}-\d{2}-\d{2}$/.test(fragment)) return null;
  return { id: fragment, path: thread ?? path };
}

/** Twikoo appends the new comment ID to this URL when composing email. */
export function commentNotificationHref(
  path: string,
  siteUrl: string
): string | undefined {
  const site = parseSiteUrl(siteUrl);
  if (!site || !isRootPath(path)) return undefined;
  const note = path.match(/^(.*)\/diary\/(\d{4})-(0[1-9]|1[0-2])-([0-3]\d)$/);
  const href = new URL(
    note
      ? `${note[1]}/notes/${note[2]}-Q${Math.ceil(Number(note[3]) / 3)}`
      : path,
    site
  );
  if (note) href.searchParams.set("thread", path);
  return href.href;
}
