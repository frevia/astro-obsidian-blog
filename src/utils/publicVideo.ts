import { readdir, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const attachmentRoots = ["attachments"];

export interface PublicVideo {
  filepath: string;
  pathname: string;
}

async function resolveFile(filepath: string): Promise<PublicVideo | undefined> {
  if (path.extname(filepath).toLowerCase() !== ".mp4") return;
  try {
    const actual = await realpath(filepath);
    const info = await stat(actual);
    if (!info.isFile()) return;
    for (const directory of attachmentRoots) {
      const root = await realpath(path.resolve("src/data", directory)).catch(
        () => undefined
      );
      if (!root) continue;
      const relative = path.relative(root, actual);
      if (
        relative &&
        !relative.startsWith(`..${path.sep}`) &&
        relative !== ".."
      ) {
        return {
          filepath: actual,
          pathname: `/${directory}/${relative
            .split(path.sep)
            .map(encodeURIComponent)
            .join("/")}`,
        };
      }
    }
  } catch {
    return;
  }
}

export async function resolvePublicVideo(
  src: string,
  fileURL: URL | undefined
): Promise<PublicVideo | undefined> {
  if (!fileURL || /^(?:https?:)?\/\//i.test(src)) return;
  let url: URL;
  try {
    url = new URL(src, fileURL);
    if (url.protocol !== "file:") return;
  } catch {
    return;
  }
  try {
    const resolved = await resolveFile(fileURLToPath(url));
    return (
      resolved && {
        ...resolved,
        pathname: `${resolved.pathname}${url.search}${url.hash}`,
      }
    );
  } catch {
    return;
  }
}

export async function enumeratePublicVideos(): Promise<PublicVideo[]> {
  const videos: PublicVideo[] = [];
  async function walk(directory: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const filepath = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(filepath);
      else {
        const video = await resolveFile(filepath);
        if (video) videos.push(video);
      }
    }
  }
  for (const directory of attachmentRoots) {
    await walk(path.resolve("src/data", directory));
  }
  return videos;
}
