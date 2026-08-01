import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

type FontSource = {
  url: string;
  format?: string;
};

type AstroFontData = Record<
  string,
  Array<{
    src: FontSource[];
    weight?: string | number;
    style?: string;
  }>
>;

type LocalFontVariant = {
  src: [URL, ...URL[]];
  weight?: string;
  style?: "normal" | "italic" | "oblique";
  unicodeRange?: [string, ...string[]];
  display?: "auto" | "block" | "swap" | "fallback" | "optional";
};

type SatoriFont = {
  name: string;
  data: ArrayBuffer;
  weight: number;
  style: "normal";
};

type LoadOgFontsOptions = {
  fontData: AstroFontData;
  getFontFileUrl: (url: string, requestUrl?: URL) => string;
  fetchFont: (url: string) => Promise<Response>;
  requestUrl?: URL;
};

const require = createRequire(import.meta.url);
const OG_CSS_VARIABLE = "--font-og";
const OG_FONT_NAME = "Ma Shan Zheng";
const OG_FONT_WEIGHTS = [400, 700, 800] as const;

function stripQuotes(value: string) {
  return value.trim().replace(/^["']|["']$/g, "");
}

function parseFontFaceDeclarations(css: string) {
  return Array.from(
    css.matchAll(/@font-face\s*{(?<body>[^}]*)}/g),
    match => match.groups?.body ?? ""
  );
}

function parseDeclarationBlock(body: string) {
  return new Map(
    body
      .split(";")
      .map(declaration => declaration.trim())
      .filter(Boolean)
      .map(declaration => {
        const separatorIndex = declaration.indexOf(":");
        return [
          declaration.slice(0, separatorIndex).trim(),
          declaration.slice(separatorIndex + 1).trim(),
        ] as const;
      })
  );
}

function parseFontSources(srcValue: string, cssPath: string, format: string) {
  const cssDirectory = dirname(cssPath);
  const sources = Array.from(
    srcValue.matchAll(/url\((?<url>[^)]+)\)(?:\s*format\((?<format>[^)]+)\))?/g)
  )
    .filter(match => {
      const sourceFormat = stripQuotes(match.groups?.format ?? "");
      return sourceFormat === format || sourceFormat === `${format}-variations`;
    })
    .map(match => {
      const rawUrl = stripQuotes(match.groups?.url ?? "");
      return pathToFileURL(resolve(cssDirectory, rawUrl));
    });

  if (sources.length === 0) {
    throw new Error(`No ${format} sources found in ${cssPath}`);
  }

  return sources as [URL, ...URL[]];
}

export function parseFontsourceCssVariants(
  css: string,
  cssPath: string,
  format: "woff2" | "woff"
): [LocalFontVariant, ...LocalFontVariant[]] {
  const variants = parseFontFaceDeclarations(css).map(body => {
    const declarations = parseDeclarationBlock(body);
    const unicodeRange = declarations.get("unicode-range");

    return {
      src: parseFontSources(declarations.get("src") ?? "", cssPath, format),
      weight: declarations.get("font-weight"),
      style: stripQuotes(declarations.get("font-style") ?? "normal") as
        | "normal"
        | "italic"
        | "oblique",
      unicodeRange: unicodeRange ? [unicodeRange] : undefined,
      display: stripQuotes(declarations.get("font-display") ?? "swap") as
        | "auto"
        | "block"
        | "swap"
        | "fallback"
        | "optional",
    };
  });

  if (variants.length === 0) {
    throw new Error(`No @font-face declarations found in ${cssPath}`);
  }

  return variants as [LocalFontVariant, ...LocalFontVariant[]];
}

export function fontsourceVariantsFromPackage(
  entrypoint: string,
  format: "woff2" | "woff"
) {
  const cssPath = require.resolve(entrypoint);
  return parseFontsourceCssVariants(
    readFileSync(cssPath, "utf8"),
    cssPath,
    format
  );
}

export function resolvePackageFileUrl(entrypoint: string) {
  return pathToFileURL(require.resolve(entrypoint));
}

function fontDataMatchesWeight(
  weight: string | number | undefined,
  target: number
) {
  if (weight === undefined) return false;
  const weightText = String(weight).trim();
  const range = weightText.match(/^(?<from>\d+)\s+(?<to>\d+)$/);

  if (range?.groups) {
    return (
      Number(range.groups.from) <= target && target <= Number(range.groups.to)
    );
  }

  return Number(weightText) === target;
}

function isWoffSource(source: FontSource) {
  return source.format === "woff" || source.url.endsWith(".woff");
}

function findOgFontSource(fontData: AstroFontData, weight: number) {
  const entries = fontData[OG_CSS_VARIABLE];
  if (!entries) {
    throw new Error(`Missing Astro fontData for ${OG_CSS_VARIABLE}`);
  }

  const entry = entries.find(
    candidate =>
      fontDataMatchesWeight(candidate.weight, weight) &&
      (candidate.style ?? "normal") === "normal" &&
      candidate.src.some(isWoffSource)
  );
  const source = entry?.src.find(isWoffSource);

  if (!source) {
    throw new Error(`Missing ${OG_CSS_VARIABLE} weight ${weight} normal woff`);
  }

  return source;
}

export async function loadOgFontsFromAstroAssets({
  fontData,
  getFontFileUrl,
  fetchFont,
  requestUrl,
}: LoadOgFontsOptions): Promise<SatoriFont[]> {
  const fontBufferBySourceUrl = new Map<string, Promise<ArrayBuffer>>();

  const loadSourceData = (source: FontSource, weight: number) => {
    const cached = fontBufferBySourceUrl.get(source.url);
    if (cached) return cached;

    const fontUrl = getFontFileUrl(source.url, requestUrl);
    const pending = fetchFont(fontUrl).then(async response => {
      if (!response.ok) {
        throw new Error(
          `Failed to load ${OG_CSS_VARIABLE} weight ${weight} from ${fontUrl}: ${response.status}`
        );
      }

      return response.arrayBuffer();
    });

    fontBufferBySourceUrl.set(source.url, pending);
    return pending;
  };

  return Promise.all(
    OG_FONT_WEIGHTS.map(async weight => {
      const source = findOgFontSource(fontData, weight);
      const data = await loadSourceData(source, weight);

      return {
        name: OG_FONT_NAME,
        data,
        weight,
        style: "normal",
      };
    })
  );
}

export async function loadOgFonts(requestUrl?: URL) {
  const { fontData, experimental_getFontFileURL } = await import(
    "astro:assets"
  );

  return loadOgFontsFromAstroAssets({
    fontData,
    getFontFileUrl: experimental_getFontFileURL,
    fetchFont: fetch,
    requestUrl,
  });
}
