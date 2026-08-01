import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const componentSource = readFileSync(
  resolve(import.meta.dirname, "SearchDialog.astro"),
  "utf-8"
);
const scriptSource = readFileSync(
  resolve(import.meta.dirname, "../scripts/search-dialog.ts"),
  "utf-8"
);
const loaderSource = readFileSync(
  resolve(import.meta.dirname, "../scripts/pagefind-loader.ts"),
  "utf-8"
);

describe("global search dialog", () => {
  it("keeps the Pagefind engine behind an interaction-triggered import", () => {
    expect(loaderSource).toContain("@vite-ignore");
    expect(loaderSource).toContain("scriptUrl");
    expect(scriptSource).toContain("event.metaKey || event.ctrlKey");
    expect(scriptSource).toContain('event.key.toLowerCase() === "k"');
    expect(scriptSource).toContain("dialog.showModal()");
  });

  it("provides a native dialog and a normal search-page fallback", () => {
    expect(componentSource).toContain('id="global-search-dialog"');
    expect(componentSource).toContain(
      'data-fallback-href={withBase("/search")}'
    );
    expect(componentSource).toContain('id="global-search-input"');
    expect(componentSource).toContain('id="global-search-results"');
    expect(componentSource).toContain('aria-controls="global-search-results"');
    expect(componentSource).toContain("data-no-results={labels.noResults}");
    expect(componentSource).toContain("data-search-dialog-close");
  });
});
