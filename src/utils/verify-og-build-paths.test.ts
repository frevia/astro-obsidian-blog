import { describe, expect, it } from "vitest";

describe("verify-og-build path filters", () => {
  it("detects generated OG PNG filenames for POSIX and Windows paths", async () => {
    const { isGeneratedOgPngPath } = await import(
      "../../scripts/verify-og-build.mjs"
    );

    expect(
      isGeneratedOgPngPath(
        "dist/client/posts/a8f3c2e91b4d47a6a0e5f8c3d2b1a907/cover.png"
      )
    ).toBe(true);
    expect(
      isGeneratedOgPngPath(
        "dist\\client\\posts\\a8f3c2e91b4d47a6a0e5f8c3d2b1a907\\index.png"
      )
    ).toBe(true);
    expect(
      isGeneratedOgPngPath(
        "dist\\client\\posts\\a8f3c2e91b4d47a6a0e5f8c3d2b1a907\\index.html"
      )
    ).toBe(false);
  });
});
