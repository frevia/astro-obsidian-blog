const URL_BASE = "https://image-caption.invalid";
const SOURCE_KEYS = ["href", "src", "url", "source", "original"];

function decode(value: string): string {
  let decoded = value;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) return decoded;
      decoded = next;
    } catch {
      return decoded;
    }
  }
  return decoded;
}

function sourceFilename(src: string, depth = 0): string {
  const input = src.trim();
  let pathname = input;

  try {
    const url = new URL(input, URL_BASE);
    const nestedSource = SOURCE_KEYS.map(key => url.searchParams.get(key)).find(
      value => value
    );
    if (nestedSource && depth < 2)
      return sourceFilename(nestedSource, depth + 1);
    pathname = url.pathname;
  } catch {
    pathname = input.split(/[?#]/, 1)[0];
  }

  const normalized = decode(pathname).replace(/\\/g, "/").replace(/\/+$/, "");
  return normalized.split("/").at(-1) ?? normalized;
}

function withoutExtension(value: string): string {
  return value.replace(/\.[^.\/]+$/, "");
}

function isGeneratedName(value: string): boolean {
  const stem = withoutExtension(value);
  return (
    /^(?:img|dsc)[-_ ]?\d[\d_-]*$/i.test(stem) ||
    /^\d[\d_-]{7,}$/.test(stem) ||
    /^(?:[a-f\d]{16,64}|[a-f\d]{8}(?:-[a-f\d]{4,})+)$/i.test(stem)
  );
}

export function getImageCaption(alt: string, src: string): string {
  const trimmedAlt = alt.trim();
  if (!trimmedAlt) return "";

  const decodedAlt = decode(trimmedAlt);
  const filename = sourceFilename(src);
  const filenameLower = filename.toLowerCase();
  const altLower = decodedAlt.toLowerCase();
  const stemLower = withoutExtension(filename).toLowerCase();
  const altHasExtension = /\.[^.\/]+$/.test(decodedAlt);

  if (
    altLower === filenameLower ||
    (!altHasExtension && altLower === stemLower) ||
    isGeneratedName(decodedAlt)
  ) {
    return "";
  }

  return alt;
}
