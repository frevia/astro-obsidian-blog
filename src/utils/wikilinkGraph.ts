import { slug as slugHeading } from "github-slugger";

/**
 * Build a small, deterministic graph from Obsidian-style wikilinks.
 *
 * The graph stays framework agnostic: hrefs are root-relative and the view
 * layer is responsible for applying Astro's configured base path.
 */

export interface WikilinkEntry {
  id: string;
  filePath?: string;
  body?: string;
  data: {
    title?: string;
    /** Optional lookup alias. Article routes are still derived from `id`. */
    slug?: string;
  };
}

export interface WikilinkReference {
  id: string;
  title: string;
  slug: string;
  href: string;
  label: string;
}

export interface WikilinkGraph {
  outgoing: ReadonlyMap<string, readonly WikilinkReference[]>;
  backlinks: ReadonlyMap<string, readonly WikilinkReference[]>;
}

interface ParsedWikilink {
  target: string;
  heading?: string;
  label: string;
}

interface EntrySnapshot {
  id: string;
  filePath?: string;
  body?: string;
  title?: string;
  slug?: string;
}

interface GraphCache {
  entries: EntrySnapshot[];
  graph: WikilinkGraph;
}

type EntryIndex = Map<string, WikilinkEntry | null>;

const FENCED_CODE_PATTERN = /```[\s\S]*?```|~~~[\s\S]*?~~~/g;
const INLINE_CODE_PATTERN = /(`+)[\s\S]*?\1/g;
const HTML_COMMENT_PATTERN = /<!--[\s\S]*?-->/g;
const WIKILINK_PATTERN = /(?<![\\!])(!?)\[\[([^\]\n]+)\]\]/g;
const MARKDOWN_EXTENSION_PATTERN = /\.(?:md|mdx)$/i;

let graphCache: GraphCache | undefined;

function decodeSafely(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    // A literal `%` is valid in a note name even though it is not a valid URI
    // escape. Keep it matchable rather than aborting the entire page build.
    return value;
  }
}

function normalizePath(value: string): string {
  const segments: string[] = [];
  const decoded = decodeSafely(value)
    .normalize("NFC")
    .trim()
    .replace(/\\/g, "/");

  for (const segment of decoded.split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      segments.pop();
      continue;
    }
    segments.push(segment);
  }

  return segments.join("/").replace(MARKDOWN_EXTENSION_PATTERN, "");
}

function normalizeKey(value: string): string {
  return normalizePath(value).toLowerCase();
}

function basenameKey(value: string): string {
  const normalized = normalizeKey(value);
  return normalized.split("/").pop() ?? normalized;
}

function displayBasename(value: string): string {
  const normalized = normalizePath(value);
  return (normalized.split("/").pop() ?? normalized).replace(/-/g, " ");
}

function getTargetAndLabel(raw: string): ParsedWikilink {
  const aliasIndex = raw.indexOf("|");
  const targetAndHeading = aliasIndex === -1 ? raw : raw.slice(0, aliasIndex);
  const alias = aliasIndex === -1 ? "" : raw.slice(aliasIndex + 1);
  const headingIndex = targetAndHeading.indexOf("#");
  const target = (
    headingIndex === -1
      ? targetAndHeading
      : targetAndHeading.slice(0, headingIndex)
  ).trim();
  const heading =
    headingIndex === -1
      ? undefined
      : targetAndHeading.slice(headingIndex + 1).trim() || undefined;

  return {
    target,
    heading,
    label: alias.trim() || displayBasename(target),
  };
}

/** Extract page wikilinks while ignoring code, comments, and image embeds. */
export function extractWikilinkTargets(markdown = ""): ParsedWikilink[] {
  const source = markdown
    .replace(FENCED_CODE_PATTERN, "\n")
    .replace(INLINE_CODE_PATTERN, "")
    .replace(HTML_COMMENT_PATTERN, "");
  const targets: ParsedWikilink[] = [];

  for (const match of source.matchAll(WIKILINK_PATTERN)) {
    if (match[1] === "!") continue;
    const parsed = getTargetAndLabel(match[2]);
    if (parsed.target) targets.push(parsed);
  }
  return targets;
}

function entryValues(entry: WikilinkEntry): string[] {
  return [entry.id, entry.data.slug ?? "", entry.filePath ?? ""].filter(
    Boolean
  );
}

function addToIndex(index: EntryIndex, key: string, entry: WikilinkEntry) {
  if (!key) return;
  if (!index.has(key)) {
    index.set(key, entry);
    return;
  }

  const existing = index.get(key);
  if (existing?.id !== entry.id) index.set(key, null);
}

function buildEntryIndexes(entries: readonly WikilinkEntry[]): {
  exact: EntryIndex;
  basename: EntryIndex;
} {
  const exact: EntryIndex = new Map();
  const basename: EntryIndex = new Map();

  for (const entry of entries) {
    for (const value of entryValues(entry)) {
      addToIndex(exact, normalizeKey(value), entry);
      addToIndex(basename, basenameKey(value), entry);
    }
  }

  return { exact, basename };
}

function relativeTargetKeys(target: string, entry: WikilinkEntry): string[] {
  const slashTarget = target.trim().replace(/\\/g, "/");
  if (!slashTarget.startsWith("./") && !slashTarget.startsWith("../")) {
    return [];
  }

  return [entry.id, entry.filePath ?? ""].flatMap(source => {
    if (!source) return [];
    const sourcePath = normalizePath(source);
    const directory = sourcePath.slice(0, sourcePath.lastIndexOf("/"));
    return directory ? [normalizeKey(`${directory}/${slashTarget}`)] : [];
  });
}

function findIndexedEntry(index: EntryIndex, keys: readonly string[]) {
  for (const key of keys) {
    const entry = index.get(key);
    if (entry) return entry;
  }
  return undefined;
}

function resolveTarget(
  target: string,
  sourceEntry: WikilinkEntry,
  exact: EntryIndex,
  basename: EntryIndex
): WikilinkEntry | undefined {
  const relativeMatch = findIndexedEntry(
    exact,
    relativeTargetKeys(target, sourceEntry)
  );
  if (relativeMatch) return relativeMatch;

  const normalizedTarget = normalizeKey(target);
  if (exact.has(normalizedTarget)) {
    // A null entry is deliberately ambiguous. Do not silently choose whichever
    // duplicate happened to appear first in the collection.
    return exact.get(normalizedTarget) ?? undefined;
  }

  return basename.get(basenameKey(target)) ?? undefined;
}

function entryRouteSlug(entry: WikilinkEntry): string {
  // Match the route contract in getPath(): collection ids, not frontmatter
  // slugs, determine the final URL segment. Do not URI-decode an id here: a
  // literal `%20` in a filename must remain distinct from a space.
  const id = entry.id.replace(/\\/g, "/").replace(/\/+$/, "");
  return id.split("/").pop() ?? id;
}

function encodePathSegment(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    character => `%${character.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

function entryHref(entry: WikilinkEntry, heading?: string): string {
  const path = `/posts/${encodePathSegment(entryRouteSlug(entry))}`;
  if (!heading) return path;

  const fragment = slugHeading(heading.trim());
  return fragment ? `${path}#${encodePathSegment(fragment)}` : path;
}

function referenceFor(
  entry: WikilinkEntry,
  label: string,
  heading?: string
): WikilinkReference {
  const routeSlug = entryRouteSlug(entry);
  return {
    id: entry.id,
    title: entry.data.title || routeSlug,
    slug: routeSlug,
    href: entryHref(entry, heading),
    label,
  };
}

function snapshotEntries(entries: readonly WikilinkEntry[]): EntrySnapshot[] {
  return entries.map(entry => ({
    id: entry.id,
    filePath: entry.filePath,
    body: entry.body,
    title: entry.data.title,
    slug: entry.data.slug,
  }));
}

function cacheMatches(entries: readonly WikilinkEntry[]): boolean {
  if (!graphCache || graphCache.entries.length !== entries.length) return false;

  return entries.every((entry, index) => {
    const cached = graphCache?.entries[index];
    return (
      cached?.id === entry.id &&
      cached.filePath === entry.filePath &&
      cached.body === entry.body &&
      cached.title === entry.data.title &&
      cached.slug === entry.data.slug
    );
  });
}

function createWikilinkGraph(entries: readonly WikilinkEntry[]): WikilinkGraph {
  const { exact, basename } = buildEntryIndexes(entries);
  const outgoing = new Map<string, readonly WikilinkReference[]>();
  const backlinkBuckets = new Map<string, WikilinkReference[]>();

  for (const entry of entries) {
    const links: WikilinkReference[] = [];
    const seenTargets = new Set<string>();

    for (const target of extractWikilinkTargets(entry.body)) {
      const targetEntry = resolveTarget(target.target, entry, exact, basename);
      if (
        !targetEntry ||
        targetEntry.id === entry.id ||
        seenTargets.has(targetEntry.id)
      ) {
        continue;
      }

      seenTargets.add(targetEntry.id);
      links.push(referenceFor(targetEntry, target.label, target.heading));

      const backlinks = backlinkBuckets.get(targetEntry.id) ?? [];
      backlinks.push(
        referenceFor(entry, entry.data.title || entryRouteSlug(entry))
      );
      backlinkBuckets.set(targetEntry.id, backlinks);
    }

    outgoing.set(entry.id, Object.freeze(links));
  }

  const backlinks = new Map<string, readonly WikilinkReference[]>();
  for (const [id, references] of backlinkBuckets) {
    backlinks.set(id, Object.freeze(references));
  }

  return { outgoing, backlinks };
}

/**
 * Build outgoing links and reverse backlinks for the supplied entries.
 *
 * Astro renders the layout once per article, normally with an equivalent new
 * collection array each time. The last value-equivalent graph is reused so the
 * same markdown bodies are not parsed and indexed for every generated page.
 */
export function buildWikilinkGraph(
  entries: readonly WikilinkEntry[]
): WikilinkGraph {
  if (cacheMatches(entries)) return graphCache!.graph;

  const graph = createWikilinkGraph(entries);
  graphCache = { entries: snapshotEntries(entries), graph };
  return graph;
}
