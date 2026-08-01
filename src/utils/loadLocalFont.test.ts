import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { describe, expect, it, vi } from "vitest";
import {
  loadOgFontsFromAstroAssets,
  parseFontsourceCssVariants,
} from "./loadLocalFont";

const require = createRequire(import.meta.url);
const REMOTE_FONT_PATTERN =
  /fonts\.googleapis\.com|fonts\.gstatic\.com|api\.fontsource\.org|cdn\.jsdelivr\.net|https?:\/\//;

describe("parseFontsourceCssVariants", () => {
  it.each([
    ["@fontsource-variable/noto-sans-sc/wght.css", 101, "100 900"],
    ["@fontsource-variable/noto-serif-sc/wght.css", 101, "200 900"],
  ])(
    "parses every @font-face from %s as local file URLs",
    (entrypoint, expectedCount, expectedWeight) => {
      const cssPath = require.resolve(entrypoint);
      const variants = parseFontsourceCssVariants(
        readFileSync(cssPath, "utf8"),
        cssPath,
        "woff2"
      );

      expect(variants).toHaveLength(expectedCount);
      expect(variants.every(variant => variant.weight === expectedWeight)).toBe(
        true
      );
      expect(variants.every(variant => variant.style === "normal")).toBe(true);
      expect(
        variants.every(variant => variant.unicodeRange?.length === 1)
      ).toBe(true);

      const urls = variants.flatMap(variant =>
        variant.src.map(source => source.toString())
      );
      expect(urls.every(url => url.startsWith("file://"))).toBe(true);
      expect(urls.every(url => url.endsWith(".woff2"))).toBe(true);
      expect(urls.some(url => REMOTE_FONT_PATTERN.test(url))).toBe(false);
      expect(new Set(urls).size).toBe(expectedCount);
    }
  );
});

describe("loadOgFontsFromAstroAssets", () => {
  const requestUrl = new URL("https://example.com/posts/example/");
  const woffData = new Uint8Array([0, 1, 2, 3]).buffer;

  it("loads Ma Shan Zheng once when 400, 700, and 800 share the same Astro asset URL", async () => {
    const fetchFont = vi.fn(async () => new Response(woffData));
    const getFontFileUrl = vi.fn(
      (url: string, passedRequestUrl?: URL) =>
        `${passedRequestUrl?.origin ?? ""}/_astro/${url.split("/").pop()}`
    );
    const sharedUrl = "file:///fonts/ma-shan-zheng.woff";

    const fonts = await loadOgFontsFromAstroAssets({
      fontData: {
        "--font-og": [400, 700, 800].map(weight => ({
          weight: String(weight),
          style: "normal",
          src: [{ url: sharedUrl, format: "woff" }],
        })),
      },
      getFontFileUrl,
      fetchFont,
      requestUrl,
    });

    expect(fonts.map(font => font.weight)).toEqual([400, 700, 800]);
    expect(fonts.every(font => font.name === "Ma Shan Zheng")).toBe(true);
    expect(fonts.every(font => font.style === "normal")).toBe(true);
    expect(fonts.every(font => font.data.byteLength === 4)).toBe(true);
    expect(new Set(fonts.map(font => font.data)).size).toBe(1);
    expect(getFontFileUrl).toHaveBeenCalledTimes(1);
    expect(getFontFileUrl).toHaveBeenCalledWith(sharedUrl, requestUrl);
    expect(fetchFont).toHaveBeenCalledTimes(1);
  });

  it("throws when a required OG weight is missing", async () => {
    await expect(
      loadOgFontsFromAstroAssets({
        fontData: {
          "--font-og": [
            {
              weight: "400",
              style: "normal",
              src: [{ url: "file:///fonts/ma-shan-400.woff", format: "woff" }],
            },
          ],
        },
        getFontFileUrl: url => url,
        fetchFont: async () => new Response(woffData),
        requestUrl,
      })
    ).rejects.toThrow("Missing --font-og weight 700 normal woff");
  });

  it("throws when Astro fontData is missing the OG css variable", async () => {
    await expect(
      loadOgFontsFromAstroAssets({
        fontData: {},
        getFontFileUrl: url => url,
        fetchFont: async () => new Response(woffData),
        requestUrl,
      })
    ).rejects.toThrow("Missing Astro fontData for --font-og");
  });
});
