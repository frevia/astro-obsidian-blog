import { describe, expect, it } from "vitest";
import { toTransitionName } from "./toTransitionName";

describe("toTransitionName", () => {
  it("keeps simple ascii slugs stable", () => {
    expect(toTransitionName("Hello World")).toBe("hello-world");
  });

  it("replaces ascii punctuation that is invalid in CSS custom identifiers", () => {
    expect(toTransitionName("a:b/c.d?e=f")).toBe("a-b-c-d-e-f");
  });

  it("encodes Chinese characters deterministically", () => {
    expect(toTransitionName("你好 世界")).toBe("u004f60u00597d-u004e16u00754c");
    expect(toTransitionName("你好 世界")).toBe(toTransitionName("你好 世界"));
  });

  it("prefixes values that start with a digit", () => {
    expect(toTransitionName("2026 Astro 7")).toBe("p-2026-astro-7");
  });

  it("falls back when the input has no usable identifier characters", () => {
    expect(toTransitionName("!!!")).toBe("post");
    expect(toTransitionName("   ")).toBe("post");
  });
});
