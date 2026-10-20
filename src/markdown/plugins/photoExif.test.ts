import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { load } from "cheerio";
import { journalHastPlugin } from "./journal";
import { mkdtemp, mkdir, writeFile, rm, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createSatteriMarkdownProcessor } from "@astrojs/markdown-satteri";
import { figurePlugin } from "./presentation";
import { formatPhotoExif, readPhotoExif, photoExifPlugin } from "./photoExif";

describe("photo EXIF presentation", () => {
  it("reads photographic settings from original bytes and excludes private metadata", async () => {
    const bytes = await sharp({
      create: {
        width: 1,
        height: 1,
        channels: 3,
        background: "white",
      },
    })
      .jpeg()
      .withExif({
        IFD0: {
          Make: "Test Maker",
          Model: "Test Camera",
          Artist: "Private Owner",
        },
        IFD2: {
          LensModel: "Test Lens",
          FNumber: "28/10",
          ExposureTime: "1/125",
          ISOSpeedRatings: "200",
          FocalLength: "50/1",
          BodySerialNumber: "PRIVATE-SERIAL",
        },
      })
      .toBuffer();
    const text = formatPhotoExif(bytes);
    expect(text).toContain("Test Camera");
    expect(text).toContain("品牌: Test Maker");
    expect(text).toContain("f/2.8");
    expect(text).toContain("快门: 1/125秒");
    expect(text).toContain("ISO: 200");
    expect(text).toContain("50 mm");
    expect(text).not.toContain("Private Owner");
    expect(text).not.toContain("PRIVATE-SERIAL");
  });

  it.each(["Canon EOS RP", "Canon Canon EOS RP"])(
    "does not repeat the camera make in %s",
    async model => {
      const bytes = await sharp({
        create: { width: 1, height: 1, channels: 3, background: "white" },
      })
        .jpeg()
        .withExif({ IFD0: { Model: model } })
        .toBuffer();
      expect(formatPhotoExif(bytes)).toContain("型号: Canon EOS RP");
      expect(formatPhotoExif(bytes)).not.toContain("Canon Canon");
    }
  );

  it("preserves metadata through Astro image replacement", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "photo-exif-"));
    const attachments = path.join(root, "src/data/attachments");
    await mkdir(attachments, { recursive: true });
    const bytes = await sharp({
      create: { width: 1, height: 1, channels: 3, background: "white" },
    })
      .jpeg()
      .withExif({ IFD0: { Model: "Camera Test" } })
      .toBuffer();
    await writeFile(path.join(attachments, "photo.jpg"), bytes);
    const cwd = vi.spyOn(process, "cwd").mockReturnValue(await realpath(root));
    try {
      const renderer = await createSatteriMarkdownProcessor({
        mdastPlugins: [photoExifPlugin],
        hastPlugins: [figurePlugin],
      });
      const result = await renderer.render(
        "![描述](../attachments/photo.jpg)",
        { fileURL: pathToFileURL(path.join(root, "src/data/blog/post.md")) }
      );
      expect(result.code).toContain("data-photo-exif");
      expect(result.code).toContain("Camera Test");
      expect(result.code).toContain(
        '<div class="photo-exif" aria-label="拍摄参数"><span>型号: Camera Test</span></div>'
      );
      expect(result.code).toContain("<figcaption>描述</figcaption>");
      expect(result.metadata.localImagePaths).toEqual([
        "../attachments/photo.jpg",
      ]);
      const journalRenderer = await createSatteriMarkdownProcessor({
        mdastPlugins: [photoExifPlugin],
        hastPlugins: [figurePlugin, journalHastPlugin],
      });
      const journal = await journalRenderer.render(
        "## 照片\n\n![描述](../attachments/photo.jpg)",
        {
          fileURL: pathToFileURL(path.join(root, "src/data/blog/post.md")),
          frontmatter: { pageLayout: "journal" },
        }
      );
      const $ = load(journal.code);
      expect($("details.journal-exif")).toHaveLength(1);
      expect($("details.journal-exif").attr("open")).toBeUndefined();
      expect($(".journal-exif summary").text()).toBe("Camera Test+");
      expect($(".journal-exif-fields").text()).toContain("型号: Camera Test");
      expect(journal.code).toContain("data-photo-exif");
    } finally {
      cwd.mockRestore();
      await rm(root, { recursive: true, force: true });
    }
  });

  it("silently handles absent or invalid EXIF", async () => {
    expect(formatPhotoExif(Buffer.from("invalid image"))).toBe("");
    const bytes = await sharp({
      create: {
        width: 1,
        height: 1,
        channels: 3,
        background: "white",
      },
    })
      .png()
      .toBuffer();
    expect(formatPhotoExif(bytes)).toBe("");
  });

  it("does not fetch remote images or read files outside published attachments", async () => {
    const fileURL = new URL("../../data/blog/test.md", import.meta.url);
    expect(await readPhotoExif("https://example.com/photo.jpg", fileURL)).toBe(
      ""
    );
    expect(await readPhotoExif("../../../../package.json", fileURL)).toBe("");
    expect(await readPhotoExif("missing.jpg", fileURL)).toBe("");
  });
});
