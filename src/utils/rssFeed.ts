import { toAbsoluteRssUrl } from "./rssContent";

interface ChannelImageOptions {
  site: string;
  base?: string;
  title: string;
  favicon: string;
}

export type RssCoverOptimizer = (
  imagePath: string,
  options: { thumbnailSize: number }
) => Promise<{ thumbnail: string }>;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function mimeTypeForImage(url: string): string {
  const pathname = new URL(url).pathname;
  const extension = pathname.split(".").pop()?.toLowerCase();
  switch (extension) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "svg":
      return "image/svg+xml";
    case "avif":
      return "image/avif";
    default:
      return "image/webp";
  }
}

export function createRssChannelImage({
  site,
  base = "/",
  title,
  favicon,
}: ChannelImageOptions): string {
  const link = toAbsoluteRssUrl("/", site, base);
  const url = toAbsoluteRssUrl(favicon, site, base);

  return `<image><url>${escapeXml(url)}</url><title>${escapeXml(
    title
  )}</title><link>${escapeXml(link)}</link></image>`;
}

export function createRssEnclosure(
  imageUrl: string | undefined,
  site: string,
  base = "/"
):
  | {
      url: string;
      type: string;
      length: number;
    }
  | undefined {
  if (!imageUrl?.trim()) return undefined;

  let parsedUrl: URL;
  try {
    const normalizedUrl = imageUrl.trim().startsWith("//")
      ? new URL(imageUrl.trim(), site).href
      : toAbsoluteRssUrl(imageUrl, site, base);
    parsedUrl = new URL(normalizedUrl);
  } catch {
    return undefined;
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return undefined;
  }

  return {
    url: parsedUrl.href,
    type: mimeTypeForImage(parsedUrl.href),
    length: 0,
  };
}

export async function getCoverImageUrl(
  cover: unknown,
  optimizeImage?: RssCoverOptimizer
): Promise<string | undefined> {
  if (typeof cover === "string") {
    if (!optimizeImage) return cover;

    try {
      const optimizedImageInfo = await optimizeImage(cover, {
        thumbnailSize: 1200,
      });
      return optimizedImageInfo.thumbnail || cover;
    } catch {
      return cover;
    }
  }

  if (
    cover &&
    typeof cover === "object" &&
    "src" in cover &&
    typeof cover.src === "string"
  ) {
    return cover.src;
  }

  return undefined;
}
