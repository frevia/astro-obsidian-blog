import {
  mkdtemp,
  mkdir,
  realpath,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { markdownToHtml } from "satteri";
import { createLinkProcessorPlugin } from "../markdown/plugins/links";
import { pageHastPlugins, rssHastPlugins } from "../markdown/processor";
import { GET, getStaticPaths } from "../pages/attachments/[...path]";

import { enumeratePublicVideos, resolvePublicVideo } from "./publicVideo";

describe("public video paths", () => {
  let root: string;
  const originalCwd = process.cwd();

  beforeEach(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "public-video-"));
    process.chdir(root);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(root, { recursive: true, force: true });
  });

  it("resolves local MP4 links to encoded, rooted URLs and preserves suffixes", async () => {
    const post = path.join(root, "src/data/blog/2026/post.md");
    const video = path.join(root, "src/data/attachments/2026/你好 clip.mp4");
    await mkdir(path.dirname(post), { recursive: true });
    await mkdir(path.dirname(video), { recursive: true });
    await writeFile(post, "");
    await writeFile(video, "video");

    await expect(
      resolvePublicVideo(
        "../../attachments/2026/%E4%BD%A0%E5%A5%BD%20clip.mp4?download=1#t=2",
        pathToFileURL(post)
      )
    ).resolves.toEqual({
      filepath: await realpath(video),
      pathname:
        "/attachments/2026/%E4%BD%A0%E5%A5%BD%20clip.mp4?download=1#t=2",
    });
  });

  it("renders page and RSS video links and emits the exact static bytes", async () => {
    const post = path.join(root, "src/data/blog/技术/post.md");
    const video = path.join(root, "src/data/attachments/2026/10/demo.mp4");
    await mkdir(path.dirname(video), { recursive: true });
    const bytes = new Uint8Array([0, 255, 42, 128]);
    await writeFile(video, bytes);
    for (const includeBase of [true, false]) {
      const { html } = await markdownToHtml(
        "[播放](../../attachments/2026/10/demo.mp4#t=2)",
        {
          fileURL: pathToFileURL(post),
          mdastPlugins: [
            createLinkProcessorPlugin({ includeBase, base: "/blog" }),
          ],
          hastPlugins: includeBase ? pageHastPlugins : rssHastPlugins,
        }
      );
      expect(html).toContain(
        `href="${includeBase ? "/blog" : ""}/attachments/2026/10/demo.mp4#t=2"`
      );
      if (includeBase) {
        expect(html).toContain(
          '<video src="/blog/attachments/2026/10/demo.mp4#t=2" controls playsinline preload="metadata" aria-label="播放">'
        );
        expect(html).toMatch(/<video[^>]*><a[^>]*>播放<\/a><\/video>/);
        expect(html).not.toContain("autoplay");
        expect(html).not.toContain("loop");
        expect(html).not.toContain("muted");
      } else {
        expect(html).not.toContain("<video");
      }
    }
    const routes = await getStaticPaths(
      {} as Parameters<typeof getStaticPaths>[0]
    );
    expect(routes).toHaveLength(1);
    expect(routes[0].params.path).toBe("2026/10/demo.mp4");
    const response = await GET({ props: routes[0].props } as Parameters<
      typeof GET
    >[0]);
    expect(response.headers.get("Content-Type")).toBe("video/mp4");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes);
  });

  it("rejects missing, external, non-MP4, traversal, and symlink escape targets", async () => {
    const post = path.join(root, "src/data/blog/post.md");
    const privateVideo = path.join(root, "private.mp4");
    const attachments = path.join(root, "src/data/attachments");
    await mkdir(path.dirname(post), { recursive: true });
    await mkdir(attachments, { recursive: true });
    await writeFile(post, "");
    await writeFile(privateVideo, "private");
    await symlink(privateVideo, path.join(attachments, "private.mp4"));

    for (const src of [
      "https://example.com/video.mp4",
      "../attachments/%2Fbad.mp4",
      "../../../private.mp4",
      "../attachments/private.mp4",
      "../attachments/missing.mp4",
      "../attachments/readme.txt",
    ]) {
      await expect(
        resolvePublicVideo(src, pathToFileURL(post))
      ).resolves.toBeUndefined();
    }

    for (const src of [
      "../attachments/private.mp4",
      "../attachments/missing.mp4",
    ]) {
      const { html } = await markdownToHtml(`[视频](${src})`, {
        fileURL: pathToFileURL(post),
        mdastPlugins: [createLinkProcessorPlugin()],
        hastPlugins: pageHastPlugins,
      });
      expect(html).not.toContain("<video");
    }
  });

  it("enumerates distinct matching videos under public attachment roots", async () => {
    for (const relative of [
      "attachments/2025/clip.mp4",
      "attachments/2026/clip.mp4",
      "attachments/skip.mov",
    ]) {
      const filepath = path.join(root, "src/data", relative);
      await mkdir(path.dirname(filepath), { recursive: true });
      await writeFile(filepath, "video");
    }

    const videos = await enumeratePublicVideos();
    expect(videos.map(({ pathname }) => pathname).sort()).toEqual([
      "/attachments/2025/clip.mp4",
      "/attachments/2026/clip.mp4",
    ]);
  });
});
