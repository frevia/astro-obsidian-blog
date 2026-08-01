import { describe, expect, it } from "vitest";
import { createSatteriMarkdownProcessor } from "@astrojs/markdown-satteri";
import { load } from "cheerio";

import {
  markdownFeatures,
  pageHastPlugins,
  pageMdastPlugins,
} from "@/markdown/processor";

const fixtureUrl = new URL(
  "./fixtures/legacy-characterization/current.md",
  import.meta.url
);

const createPageRenderer = () =>
  createSatteriMarkdownProcessor({
    features: markdownFeatures,
    mdastPlugins: pageMdastPlugins,
    hastPlugins: pageHastPlugins,
  });

describe("Astro Satteri markdown integration", () => {
  it("renders duplicate Chinese heading ids, anchors, and matching metadata", async () => {
    const renderer = await createPageRenderer();
    const result = await renderer.render("# 重复！标题\n\n## 重复！标题", {
      fileURL: fixtureUrl,
    });

    expect(result.code).toContain('id="重复标题"');
    expect(result.code).toContain('href="#重复标题"');
    expect(result.code).toContain('id="重复标题-1"');
    expect(result.code).toContain('href="#重复标题-1"');
    expect(result.metadata.headings).toEqual([
      { depth: 1, slug: "重复标题", text: "重复！标题" },
      { depth: 2, slug: "重复标题-1", text: "重复！标题" },
    ]);
  });

  it("does not leak heading slug state between renderer calls", async () => {
    const renderer = await createPageRenderer();

    await renderer.render("# 重复！标题\n\n# 重复！标题", {
      fileURL: fixtureUrl,
    });
    const second = await renderer.render("# 重复！标题", {
      fileURL: fixtureUrl,
    });

    expect(second.code).toContain('id="重复标题"');
    expect(second.code).toContain('href="#重复标题"');
    expect(second.code).not.toContain('id="重复标题-1"');
    expect(second.metadata.headings).toEqual([
      { depth: 1, slug: "重复标题", text: "重复！标题" },
    ]);
  });

  it("keeps local markdown images discoverable by Astro image metadata and marker replacement", async () => {
    const renderer = await createPageRenderer();
    const result = await renderer.render('![图像](./assets/pic.png "标题")', {
      fileURL: fixtureUrl,
    });

    expect(result.metadata.localImagePaths).toEqual(["./assets/pic.png"]);
    expect(result.metadata.remoteImagePaths).toEqual([]);
    expect(result.code).toContain("__ASTRO_IMAGE_");
    expect(result.code).toContain(
      "&quot;src&quot;:&quot;./assets/pic.png&quot;"
    );
    expect(result.code).toContain("&quot;alt&quot;:&quot;图像&quot;");
    expect(result.code).toContain("&quot;title&quot;:&quot;标题&quot;");
    expect(result.code).not.toContain('src="./assets/pic.png"');
  });

  it("preserves static code toolbar semantics in Astro component output", async () => {
    const renderer = await createPageRenderer();
    const result = await renderer.render(
      "```ts\nconst greeting = 'hello';\n```",
      { fileURL: fixtureUrl }
    );
    const $ = load(result.code);

    expect(result.code).toContain('data-code-toolbar="true"');
    expect(result.code).toContain('data-code-language="true"');
    expect(result.code).toContain('data-copy-button="true"');
    expect($("[data-code-language]").text()).toBe("ts");
    expect($("pre code").text()).toBe("const greeting = 'hello';");
    expect(result.code.match(/tabindex="0"/g)).toHaveLength(1);
  });
});
