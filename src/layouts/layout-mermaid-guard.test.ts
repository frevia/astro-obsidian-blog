import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("layout mermaid runtime guard", () => {
  it("uses language-mermaid selector and exits early on pages without mermaid", () => {
    const source = readFileSync("src/layouts/Layout.astro", "utf-8");

    expect(source).toContain("language-mermaid");
    expect(source).toContain(
      "document.querySelector(\"pre code.language-mermaid\")"
    );
    expect(source).toContain("if (!hasMermaidBlocks) return;");
  });

  it("binds global observer only once", () => {
    const source = readFileSync("src/layouts/Layout.astro", "utf-8");

    expect(source).toContain("if (!globalState.__mermaidObserverBound)");
    expect(source).toContain("globalState.__mermaidObserverBound = true;");
  });

  it("skips already hidden mermaid blocks on subsequent page loads", () => {
    const source = readFileSync("src/layouts/Layout.astro", "utf-8");

    expect(source).toContain(
      "if (preEl.dataset.mermaidProcessed === \"true\" || preEl.classList.contains(\"hidden\")) continue;"
    );
  });
});
