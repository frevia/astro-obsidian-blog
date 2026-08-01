export interface PagefindResultData {
  url: string;
  excerpt?: string;
  meta?: Record<string, string>;
  sub_results?: Array<{ title?: string; url?: string; excerpt?: string }>;
}

export interface PagefindSearchResult {
  data: () => Promise<PagefindResultData>;
}

export interface PagefindInstance {
  search: (query: string) => Promise<{ results: PagefindSearchResult[] }>;
}

export type PagefindImporter = (scriptUrl: string) => Promise<PagefindInstance>;

const importPagefind: PagefindImporter = scriptUrl =>
  import(/* @vite-ignore */ scriptUrl) as Promise<PagefindInstance>;

export function createPagefindLoader(
  importer: PagefindImporter = importPagefind
) {
  const pendingByUrl = new Map<string, Promise<PagefindInstance>>();

  return (bundlePath: string): Promise<PagefindInstance> => {
    const scriptUrl = `${bundlePath.replace(/\/+$/, "")}/pagefind.js`;
    const pending = pendingByUrl.get(scriptUrl);
    if (pending) return pending;

    const next = importer(scriptUrl);
    pendingByUrl.set(scriptUrl, next);
    void next.catch(() => {
      if (pendingByUrl.get(scriptUrl) === next) {
        pendingByUrl.delete(scriptUrl);
      }
    });
    return next;
  };
}

/** Load the generated Pagefind bundle only after the search palette opens. */
export const loadPagefind = createPagefindLoader();
