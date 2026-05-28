import { describe, expect, it } from "vitest";
import { SKIN_TOKEN_MAP, REQUIRED_SKIN_KEYS } from "./theme-tokens";

describe("SKIN_TOKEN_MAP", () => {
  it("maps muted and interaction tokens to semantic vars", () => {
    expect(SKIN_TOKEN_MAP.muted).toBe("var(--foreground-muted)");
    expect(SKIN_TOKEN_MAP.stateHoverFill).toBe("var(--interactive-hover)");
    expect(SKIN_TOKEN_MAP.stateActiveFill).toBe("var(--interactive-active)");
  });

  it("maps every required skin key to a semantic CSS variable", () => {
    for (const key of REQUIRED_SKIN_KEYS) {
      expect(SKIN_TOKEN_MAP[key]).toMatch(/^var\(--|color-mix\(/);
    }
  });

  it("defines every required skin key", () => {
    for (const key of REQUIRED_SKIN_KEYS) {
      expect(SKIN_TOKEN_MAP[key].length).toBeGreaterThan(0);
    }
    expect(Object.keys(SKIN_TOKEN_MAP)).toHaveLength(REQUIRED_SKIN_KEYS.length);
  });

  it("includes new semantic state and reading tokens", () => {
    const requiredNewKeys = [
      "stateFocusRing",
      "stateHoverFill",
      "stateActiveFill",
      "spaceReadingBlock",
    ] as const;

    expect(REQUIRED_SKIN_KEYS).toEqual(
      expect.arrayContaining([...requiredNewKeys])
    );

    for (const key of requiredNewKeys) {
      expect(SKIN_TOKEN_MAP).toHaveProperty(key);
      const value = (SKIN_TOKEN_MAP as Record<string, string>)[key];
      expect(value).toMatch(/^var\(--|color-mix\(/);
    }
  });
});

