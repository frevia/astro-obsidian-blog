import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const layoutPath = resolve(import.meta.dirname, "Layout.astro");
const enhancerPath = resolve(
  import.meta.dirname,
  "../scripts/mermaid-enhancer.ts"
);

describe("layout mermaid runtime guard", () => {
  it("keeps Mermaid out of the eager layout dependency graph", () => {
    const layoutSource = readFileSync(layoutPath, "utf-8");
    const enhancerSource = readFileSync(enhancerPath, "utf-8");

    expect(layoutSource).toContain(
      'import { setupMermaidEnhancer } from "@/scripts/mermaid-enhancer"'
    );
    expect(layoutSource).not.toContain('import mermaid from "mermaid"');
    expect(enhancerSource).toContain('import("mermaid")');
  });
});
