import { describe, expect, it } from "vitest";
import { createSatteriMarkdownProcessor } from "@astrojs/markdown-satteri";
import { load } from "cheerio";

import {
  markdownFeatures,
  pageHastPlugins,
  pageMdastPlugins,
  renderRssMarkdown,
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
  it("applies journal chapters and photo spreads from Astro frontmatter", async () => {
    const renderer = await createPageRenderer();
    const source = [
      "## 河边",
      "",
      "一段开场文字。",
      "",
      "> [!photos]",
      "> ![桥](./bridge.jpg) ![河](./river.jpg)",
      "",
      "> [!moment] 午后随手记",
      "> 记下一句 **随手记**，再看看[路线](https://example.com/map)。",
      "",
      "## 回家",
      "",
      "这一段继续保留。",
    ].join("\n");
    const result = await renderer.render(source, {
      fileURL: fixtureUrl,
      frontmatter: { pageLayout: "journal" },
    });
    const $ = load(result.code);

    expect($(".journal-chapter")).toHaveLength(2);
    expect($(".journal-chapter").first().find("h2").attr("id")).toBe("河边");
    expect($(".journal-chapter").first().text()).toContain("一段开场文字");
    expect($(".journal-chapter").last().find("h2").text()).toContain("回家");
    expect($(".journal-chapter").last().text()).toContain("这一段继续保留");
    expect($(".journal-spread .journal-photos .rehype-figure")).toHaveLength(2);
    expect($(".journal-spread .journal-moment strong").text()).toBe("随手记");
    expect($(".journal-spread .journal-moment a").attr("href")).toBe(
      "https://example.com/map"
    );
    expect($(".journal-moment-label").text()).toBe("午后随手记");
    expect(result.metadata.localImagePaths).toEqual([
      "./bridge.jpg",
      "./river.jpg",
    ]);
    expect(result.code).toContain("__ASTRO_IMAGE_");
  });

  it("preserves photo group titles and duplicate chapter anchors", async () => {
    const renderer = await createPageRenderer();
    const result = await renderer.render(
      "## 同名章节\n\n> [!photos] 河边的两张照片\n> ![桥](./bridge.jpg) ![河](./river.jpg)\n\n## 同名章节\n\n最后一段。",
      { fileURL: fixtureUrl, frontmatter: { pageLayout: "journal" } }
    );
    const $ = load(result.code);
    expect($(".journal-photo-label").text()).toBe("河边的两张照片");
    expect($(".journal-photos").attr("data-photo-count")).toBe("2");
    expect(
      $(".journal-chapter h2")
        .map((_, el) => $(el).attr("id"))
        .get()
    ).toEqual(["同名章节", "同名章节-1"]);
    expect(result.metadata.headings.map(h => h.slug)).toEqual([
      "同名章节",
      "同名章节-1",
    ]);
    expect($(".journal-chapter").last().text()).toContain("最后一段。");
  });

  it("leaves ordinary page markup and RSS content outside the journal layout", async () => {
    const renderer = await createPageRenderer();
    const source = [
      "## 普通章节",
      "",
      "> [!photos]",
      "> ![图](./photo.jpg)",
      "",
      "> [!moment] 09:30",
      "> 原始随手记。",
    ].join("\n");
    const ordinary = await renderer.render(source, { fileURL: fixtureUrl });
    const rss = await renderRssMarkdown(source, { fileURL: fixtureUrl });

    expect(
      load(ordinary.code)(".journal-chapter, .journal-photos, .journal-moment")
    ).toHaveLength(0);
    expect(rss).toContain("原始随手记");
    expect(rss).not.toContain("journal-spread");
  });

  it("keeps empty and collapsible journal callout content intact", async () => {
    const renderer = await createPageRenderer();
    const result = await renderer.render(
      [
        "## Notes",
        "",
        "> [!photos]",
        "",
        "> [!photos]- Collection",
        "> Keep this description and [source](https://example.com/photo).",
        "",
        "> [!moment]- Afternoon note",
        "> Preserve **the original note** here.",
      ].join("\n"),
      { fileURL: fixtureUrl, frontmatter: { pageLayout: "journal" } }
    );
    const $ = load(result.code);
    expect($(".journal-photos")).toHaveLength(2);
    expect($(".journal-photos").first().text().trim()).toBe("");
    expect($(".journal-photos").last().text()).toContain(
      "Keep this description"
    );
    expect($(".journal-photos a").attr("href")).toBe(
      "https://example.com/photo"
    );
    expect($(".journal-moment details").text()).toContain("the original note");
    expect($(".journal-moment-label").text()).toBe("Afternoon note");
  });

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
