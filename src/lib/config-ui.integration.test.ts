import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("resolved AstroPaper config UI integration", () => {
  it("renders the resolved Google verification value from SITE", () => {
    const layout = readFileSync("src/layouts/Layout.astro", "utf8");

    expect(layout).toContain("SITE.googleVerification &&");
    expect(layout).toContain("content={SITE.googleVerification}");
    expect(layout).not.toContain(
      'import { PUBLIC_GOOGLE_SITE_VERIFICATION } from "astro:env/client"'
    );
  });
});
