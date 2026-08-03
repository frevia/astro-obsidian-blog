import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("BackButton semantic action control", () => {
  const filePath = resolve(import.meta.dirname, "BackButton.astro");
  const source = readFileSync(filePath, "utf-8");

  it("does not use javascript:void(0) href", () => {
    expect(source).not.toContain("javascript:void(0)");
  });

  it("uses button semantics and keeps back behavior", () => {
    expect(source).toContain("<button");
    expect(source).toContain('type="button"');
    expect(source).toContain("const stack = readStack();");
    expect(source).toContain('const fallbackHref = withBase("/")');
    expect(source).toContain("location.assign(fallbackHref)");
    expect(source).toContain("initBackButton();");
  });
});
