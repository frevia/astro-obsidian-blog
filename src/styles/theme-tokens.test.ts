import { describe, expect, it } from "vitest";
import { SKIN_TOKEN_MAP, REQUIRED_SKIN_KEYS } from "./theme-tokens";

describe("SKIN_TOKEN_MAP", () => {
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
});
