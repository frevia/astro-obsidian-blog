import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("search page Pagefind v2 integration", () => {
  const searchPagePath = resolve(import.meta.dirname, "../pages/search.astro");
  const pagefindConfigPath = resolve(
    import.meta.dirname,
    "../../node_modules/astro-pagefind/src/components/PagefindConfig.astro"
  );

  const readSearchPage = () => readFileSync(searchPagePath, "utf-8");

  it("imports the Astro component entrypoint with an explicit extension", () => {
    const source = readSearchPage();

    expect(source).toContain(
      'import PagefindSearch from "astro-pagefind/components/Search.astro"'
    );
    expect(source).not.toContain(
      'import PagefindSearch from "astro-pagefind/components/Search"'
    );
  });

  it("uses Pagefind v2 searchbox options instead of legacy UI options", () => {
    const source = readSearchPage();

    expect(source).toContain("searchboxOptions");
    expect(source).toContain('"show-sub-results": true');
    expect(source).not.toContain("uiOptions");
    expect(source).not.toContain("showImages");
    expect(source).not.toContain("showSubResults");
  });

  it("keeps the public search anchor outside the Pagefind component", () => {
    const source = readSearchPage();

    expect(source).toContain('<div id="search">');
    expect(source).not.toContain('id="search"\n      className=');
  });

  it("syncs URL state through the Pagefind v2 input without legacy listeners", () => {
    const source = readSearchPage();

    expect(source).toContain(".pf-searchbox-input");
    expect(source).toContain("dataset.searchUrlSyncBound");
    expect(source).toContain('document.addEventListener("astro:page-load"');
    expect(source).toContain('"astro:before-swap"');
    expect(source).toContain("clearPendingSearchURLUpdate");
    expect(source).not.toContain(".pagefind-ui__search-input");
    expect(source).not.toContain(".pagefind-ui__search-clear");
  });

  it("clears pending URL updates before swaps and ignores disconnected inputs", () => {
    const source = readSearchPage();

    expect(source).toContain("clearPendingSearchURLUpdate");
    expect(source).toContain("clearTimeout(searchURLSyncState.debounceTimer)");
    expect(source).toContain("!searchInput.isConnected");
  });

  it("binds global Astro lifecycle listeners only once", () => {
    const source = readSearchPage();

    expect(source).toContain("listenersBound");
    expect(source).toContain("bindGlobalSearchURLSyncListeners");
    expect(source).toContain("searchURLSyncState.listenersBound = true");
  });

  it("preserves Astro ClientRouter history state when syncing query params", () => {
    const source = readSearchPage();

    expect(source).toContain(
      'window.history.replaceState(window.history.state, "", url.toString())'
    );
    expect(source).not.toContain(
      'window.history.replaceState({}, "", url.toString())'
    );
  });

  it("styles real Pagefind searchbox classes and variables only", () => {
    const source = readSearchPage();

    expect(source).toContain("--pf-font");
    expect(source).toContain(".pf-searchbox-result");
    expect(source).toContain(".pf-searchbox-result-title");
    expect(source).toContain(".pf-searchbox-subresult");
    expect(source).toContain(".pf-searchbox-input");
    expect(source).not.toContain(".pf-result-");
    expect(source).not.toContain(".pf-heading-");
    expect(source).not.toContain("--pagefind-ui-");
    expect(source).not.toContain(".pagefind-ui__");
  });

  it("relies on astro-pagefind PagefindConfig to resolve bundle-path from BASE_URL", () => {
    const source = readFileSync(pagefindConfigPath, "utf-8");

    expect(source).toContain('import { join } from "node:path/posix"');
    expect(source).toContain('join(import.meta.env.BASE_URL, "pagefind/")');
    expect(source).toContain("bundle-path={bundlePath}");
  });
});
