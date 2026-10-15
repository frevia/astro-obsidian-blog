import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { pathToFileURL } from "node:url";

const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function walk(dir) {
  return readdirSync(dir).flatMap(entry => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function readPngDimensions(path) {
  const data = readFileSync(path);
  assert(
    pngSignature.every((byte, index) => data[index] === byte),
    `${path} is not a PNG`
  );

  return {
    width: data.readUInt32BE(16),
    height: data.readUInt32BE(20),
  };
}

export function isGeneratedOgPngPath(path) {
  const fileName = basename(path.replaceAll("\\", "/"));
  return fileName === "cover.png" || fileName === "index.png";
}

export function verifyOgBuild(distClient = "dist/client") {
  const astroFontsDir = join(distClient, "_astro", "fonts");
  const fontFiles = walk(astroFontsDir).filter(path =>
    /\.(woff2?|ttf|otf)$/.test(path)
  );
  const astroWoff2Count = fontFiles.filter(path =>
    path.endsWith(".woff2")
  ).length;
  const astroWoffCount = fontFiles.filter(path => path.endsWith(".woff")).length;

  assert(
    astroWoffCount >= 1,
    `Expected at least one Astro woff font for OG, found ${astroWoffCount}`
  );

  const htmlFiles = walk(distClient).filter(path => path.endsWith(".html"));
  const fontPreloadLinks = htmlFiles.flatMap(path => {
    const html = readFileSync(path, "utf8");
    return Array.from(
      html.matchAll(/<link\b[^>]*rel=["']?preload["']?[^>]*>/gi)
    )
      .map(match => match[0])
      .filter(link => /\bas=["']?font["']?/i.test(link));
  });

  const astroFontPreloads = fontPreloadLinks.filter(link =>
    link.includes("/_astro/fonts/")
  );
  assert(
    astroFontPreloads.length === 0,
    `Expected no Astro page font preload links, found ${astroFontPreloads.length}`
  );

  const ogPngFiles = walk(join(distClient, "posts")).filter(
    isGeneratedOgPngPath
  );
  const siteOg = readPngDimensions(join(distClient, "og.png"));
  assert(siteOg.width === 1200 && siteOg.height === 630,
    "Expected a 1200x630 site og.png image");

  const dimensions = ogPngFiles.map(path => ({
    path,
    ...readPngDimensions(path),
  }));
  for (const { path, width, height } of dimensions) {
    const isCover = basename(path) === "cover.png";
    assert(width === (isCover ? 1000 : 1200) && height === (isCover ? 1000 : 630),
      `Unexpected OG image dimensions for ${path}: ${width}x${height}`);
  }

  return {
    siteOg,
    astroFonts: fontFiles.length,
    astroWoff2: astroWoff2Count,
    astroWoff: astroWoffCount,
    astroFontPreloads: astroFontPreloads.length,
    ogPngFiles: dimensions.length,
    ogPngDimensions: dimensions.map(({ width, height }) => ({
      width,
      height,
    })),
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(JSON.stringify(verifyOgBuild(), null, 2));
}
