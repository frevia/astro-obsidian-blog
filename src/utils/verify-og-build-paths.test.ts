import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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

describe("verifyOgBuild current font and cover layout", () => {
  it("accepts one OG font and no generated post covers, but rejects invalid images or missing fonts", async () => {
    const { verifyOgBuild } = await import("../../scripts/verify-og-build.mjs");
    const root = mkdtempSync(join(tmpdir(), "og-check-"));
    const fonts = join(root, "_astro/fonts");
    const posts = join(root, "posts/example");
    function png(width: number, height: number) {
      const bytes = Buffer.alloc(24);
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(bytes);
      bytes.writeUInt32BE(width, 16);
      bytes.writeUInt32BE(height, 20);
      return bytes;
    }
    try {
      mkdirSync(fonts, { recursive: true });
      mkdirSync(posts, { recursive: true });
      writeFileSync(join(fonts, "og.woff"), "fixture");
      writeFileSync(join(root, "og.png"), png(1200, 630));
      expect(verifyOgBuild(root)).toMatchObject({
        astroFonts: 1,
        ogPngFiles: 0,
      });
      writeFileSync(join(posts, "cover.png"), png(1000, 1000));
      writeFileSync(join(posts, "index.png"), png(1200, 630));
      expect(verifyOgBuild(root).ogPngFiles).toBe(2);
      writeFileSync(join(posts, "index.png"), png(1000, 1000));
      expect(() => verifyOgBuild(root)).toThrow(
        "Unexpected OG image dimensions"
      );
      rmSync(join(fonts, "og.woff"));
      expect(() => verifyOgBuild(root)).toThrow("at least one Astro woff font");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
