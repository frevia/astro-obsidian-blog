import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ExifReader from "exifreader";
import { defineMdastPlugin } from "satteri";

export function formatPhotoExif(bytes: Buffer): string {
  try {
    const tags = ExifReader.load(bytes, { expanded: true }).exif;
    if (!tags) return "";
    const value = (
      key:
        | "Model"
        | "Make"
        | "FNumber"
        | "ExposureTime"
        | "ISOSpeedRatings"
        | "FocalLength"
    ) => {
      const tag = tags[key];
      const description = tag?.description;
      return typeof description === "string" || typeof description === "number"
        ? String(description).replace(/\0/g, "").trim().slice(0, 160)
        : "";
    };
    const make = value("Make");
    // Some files repeat the brand inside Model even when Make is absent.
    const model = value("Model").replace(/^(\S+)(?:\s+\1)+(?=\s)/i, "$1");
    return [
      ["品牌", make],
      ["型号", model],
      ["焦距", value("FocalLength")],
      ["光圈", value("FNumber")],
      ["快门", value("ExposureTime") && `${value("ExposureTime")}秒`],
      ["ISO", value("ISOSpeedRatings")],
    ]
      .filter(([, text]) => text)
      .map(([label, text]) => `${label}: ${text}`)
      .join(" · ");
  } catch {
    return "";
  }
}

const cache = new Map<string, { stamp: string; text: string }>();

export async function readPhotoExif(
  src: string,
  fileURL?: URL
): Promise<string> {
  if (!fileURL || /^(?:[a-z][a-z\d+.-]*:|\/)/i.test(src)) return "";
  try {
    const resolved = await realpath(fileURLToPath(new URL(src, fileURL)));
    const roots = ["src/data/attachments", "src/data/attachment"].map(
      root => path.resolve(root) + path.sep
    );
    if (!roots.some(root => resolved.startsWith(root))) return "";
    const info = await stat(resolved);
    const stamp = `${info.mtimeMs}:${info.size}`;
    const cached = cache.get(resolved);
    if (cached?.stamp === stamp) return cached.text;
    const text = formatPhotoExif(await readFile(resolved));
    cache.set(resolved, { stamp, text });
    return text;
  } catch {
    // Missing metadata or unsupported images must never prevent article rendering.
    return "";
  }
}

export const photoExifPlugin = defineMdastPlugin({
  name: "photo-exif",
  async image(node, ctx) {
    if (!/\.(?:jpe?g|png|webp|avif|tiff?)$/i.test(node.url)) return;
    const text = await readPhotoExif(node.url, ctx.fileURL);
    if (!text) return;
    ctx.setProperty(node, "data", {
      ...node.data,
      hProperties: {
        ...node.data?.hProperties,
        "data-photo-exif": text,
      },
    });
  },
});
