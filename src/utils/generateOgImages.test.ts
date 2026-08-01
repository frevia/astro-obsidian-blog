import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const maShanZhengWoff = readFileSync(
  require.resolve(
    "@fontsource/ma-shan-zheng/files/ma-shan-zheng-chinese-simplified-400-normal.woff"
  )
);

vi.mock("./loadLocalFont", () => ({
  loadOgFonts: async () =>
    [400, 700, 800].map(weight => ({
      name: "Ma Shan Zheng",
      data: maShanZhengWoff.buffer.slice(
        maShanZhengWoff.byteOffset,
        maShanZhengWoff.byteOffset + maShanZhengWoff.byteLength
      ),
      weight,
      style: "normal",
    })),
}));

describe("generateOgImageForSite", () => {
  it("renders a PNG image with local OG fonts", async () => {
    const { generateOgImageForSite } = await import("./generateOgImages");

    const png = await generateOgImageForSite(new URL("https://example.com/"));

    expect(Array.from(png.subarray(0, 8))).toEqual([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
  });
});
