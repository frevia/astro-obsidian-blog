import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

describe("about page asset references", () => {
  it("resolves local image import paths", () => {
    const aboutPath = "src/pages/about.mdx";
    const source = readFileSync(aboutPath, "utf-8");

    const localImports = Array.from(
      source.matchAll(/import\s+\w+\s+from\s+["'](\.\.\/[^"']+)["'];?/g),
      match => match[1]
    );

    for (const importPath of localImports) {
      const resolved = resolve(dirname(aboutPath), importPath);
      expect(existsSync(resolved)).toBe(true);
    }
  });
});
