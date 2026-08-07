import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { describe, expect, it, vi } from "vitest";
import { createSatteriMarkdownProcessor } from "@astrojs/markdown-satteri";
import { load } from "cheerio";
import { markdownToHtml, mdxToJs } from "satteri";

import {
  createLinkProcessorPlugin,
  rssLinkProcessorPlugin,
} from "@/markdown/plugins/links";
import {
  markdownFeatures,
  pageHastPlugins,
  pageMdastPlugins,
  renderRssMarkdown,
  rssHastPlugins,
  rssMdastPlugins,
} from "@/markdown/processor";
import { parseCardContent } from "@/markdown/plugins/mediaCards";

const fixtureUrl = new URL(
  "./fixtures/legacy-characterization/current.md",
  import.meta.url
);
const postFixtureUrl = new URL(
  "./fixtures/legacy-characterization/posts/中文页面.md",
  import.meta.url
);

describe("processor contract", () => {
  it("renders RSS callouts with preserved type, title, and body", async () => {
    const html = await renderRssMarkdown("> [!note] RSS标题\n> 正文");

    expect(html).toContain("RSS标题");
    expect(html).toContain("正文");
    expect(html).toContain("callout");
  });

  it("resolves wikilinks to the frontmatter route slug", async () => {
    const html = await renderRssMarkdown(
      "链接 [[posts/中文页面|中文标题]]，附件 ![[assets/图像.png]]",
      { fileURL: fixtureUrl }
    );

    expect(html).toContain('href="/posts/zh-page"');
    expect(html).toContain("中文标题");
    expect(html).toContain('src="assets/%E5%9B%BE%E5%83%8F.png"');
    expect(html).toContain('alt="图像"');
  });

  it("resolves extensionless PKI MDX wikilinks whose titles contain dots", async () => {
    const targets = [
      {
        name: "理解PKI（二）：从 ASN.1 到 DER，数字证书为什么是一串字节",
        slug: "be9b536935064a2c9c8d3f59d7c67677",
      },
      {
        name: "理解PKI（三）：拆开 X.509 v3——读懂证书的核心字段与扩展",
        slug: "29ee87252fdf4fc8896d98db8e9dafff",
      },
    ];

    for (const target of targets) {
      const html = await renderRssMarkdown(`[[${target.name}|下一篇]]`, {
        fileURL: postFixtureUrl,
      });

      expect(html).toContain(`href="/posts/${target.slug}"`);
      expect(html).toContain("下一篇");
    }
  });

  it("resolves public wiki wikilinks while failing closed for unknown files", async () => {
    const projectRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "wiki-wikilink-")
    );
    const wikiDir = path.join(projectRoot, "src/data/wiki/concepts");
    const privateDir = path.join(projectRoot, "knowledge/wiki/personal");
    fs.mkdirSync(wikiDir, { recursive: true });
    fs.mkdirSync(privateDir, { recursive: true });
    fs.writeFileSync(
      path.join(wikiDir, "数字证书.md"),
      "---\nsources: []\n---\n# 数字证书"
    );
    fs.writeFileSync(path.join(privateDir, "秘密.md"), "# 私有页面");
    const sourcePath = path.join(wikiDir, "来源.md");
    fs.writeFileSync(sourcePath, "# 来源");
    const cwd = vi.spyOn(process, "cwd").mockReturnValue(projectRoot);

    try {
      const html = await renderRssMarkdown(
        "公开 [[数字证书|数字证书]]，私有 [[../../../../knowledge/wiki/personal/秘密|不应路由]]",
        { fileURL: pathToFileURL(sourcePath) }
      );

      expect(html).toContain(
        'href="/wiki/concepts/%E6%95%B0%E5%AD%97%E8%AF%81%E4%B9%A6"'
      );
      expect(html).not.toContain("/posts/秘密");
      expect(html).not.toContain("/wiki/personal");
      expect(html).not.toContain("不应路由");
    } finally {
      cwd.mockRestore();
      fs.rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  it("prefixes ordinary root-relative page links with base while RSS keeps them root-relative", async () => {
    const page = await markdownToHtml("[About](/about)", {
      features: markdownFeatures,
      mdastPlugins: [createLinkProcessorPlugin({ base: "/blog" })],
      hastPlugins: [],
    });
    const rss = await markdownToHtml("[About](/about)", {
      features: markdownFeatures,
      mdastPlugins: [rssLinkProcessorPlugin],
      hastPlugins: [],
    });

    expect(page.html).toContain('href="/blog/about"');
    expect(rss.html).toContain('href="/about"');
  });

  it("keeps relative attachment image paths intact for Astro image metadata", async () => {
    const renderer = await createSatteriMarkdownProcessor({
      features: markdownFeatures,
      mdastPlugins: pageMdastPlugins,
      hastPlugins: pageHastPlugins,
    });
    const imagePath = "../attachments/202406271801276_1775657297532706.png";
    const result = await renderer.render(`![](${imagePath})`, {
      fileURL: fixtureUrl,
    });

    expect(result.metadata.localImagePaths).toEqual([imagePath]);
    expect(result.code).toContain("__ASTRO_IMAGE_");
    expect(result.code).toContain(imagePath);
    expect(result.code).not.toContain('202406271801276_1775657297532706.png"');
  });

  it("resolves heading hashes in wikilinks without corrupting the pathname", async () => {
    const html = await renderRssMarkdown(
      "链接 [[posts/中文页面#二级 标题|中文标题]]",
      {
        fileURL: fixtureUrl,
      }
    );

    expect(decodeURIComponent(html)).toContain(
      'href="/posts/zh-page#二级-标题"'
    );
    expect(html).not.toContain("%E6%A0%87%E9%A2%98md");
    expect(html).toContain("中文标题");
  });

  it("keeps highlight, KaTeX, and figure semantics in RSS rendering", async () => {
    const html = await renderRssMarkdown(
      "==高亮==\n\n![图注](assets/1.png) ![图注2](assets/2.png)\n\n$E=mc^2$"
    );

    expect(html).toContain("<mark>高亮</mark>");
    expect(html).toContain('<div class="rehype-figure-container">');
    expect(html).toContain('class="katex"');
    expect(html).not.toContain('&lt;span class="katex"');
  });

  it("renders display math as real KaTeX HAST without a pre wrapper", async () => {
    const html = await renderRssMarkdown("$$\nE=mc^2\n$$");

    expect(html).toContain('class="katex-display"');
    expect(html).not.toContain("<pre><span");
  });

  it("keeps highlights as mark siblings and ignores code contexts", async () => {
    const html = await renderRssMarkdown(
      "==重== 和 ==复== `==code==`\n\n```txt\n==block==\n```"
    );

    expect(html).toContain(
      "<p><mark>重</mark> 和 <mark>复</mark> <code>==code==</code></p>"
    );
    expect(html).toContain("<code");
    expect(html).toContain("==block==");
    expect(html).not.toContain("<mark>block</mark>");
    expect(html).not.toContain("<span><mark>");
  });

  it("cleans callout temporary properties and keeps type-specific icon semantics", async () => {
    const html = await renderRssMarkdown("> [!warning]- 警告标题\n> 正文");

    expect(html).toContain('class="callout callout-warning"');
    expect(html).toContain('data-callout="warning"');
    expect(html).toContain('data-expanded="false"');
    expect(html).toContain("警告标题");
    expect(html).toContain("<path");
    expect(html).not.toContain("data-callout-title");
    expect(html).not.toContain("properties=");
  });

  it("preserves the legacy icon families for callout aliases", async () => {
    const iconFamilies = [
      { types: ["note"], marker: 'd="M7.5 20.5 19 9' },
      { types: ["abstract", "summary", "tldr"], marker: "<rect" },
      { types: ["info"], marker: "<circle" },
      { types: ["todo"], marker: 'd="M12 22c5.523' },
      { types: ["tip", "hint", "important"], marker: 'd="M8.5 14.5' },
      {
        types: ["success", "check", "done"],
        marker: '<polyline points="20 6 9 17 4 12"',
      },
      {
        types: ["question", "help", "faq"],
        marker: 'd="M9.09 9a3 3',
      },
      {
        types: ["warning", "attention", "caution"],
        marker: 'd="m21.73 18-8-14',
      },
      {
        types: ["failure", "missing", "fail"],
        marker: '<line x1="18" y1="6" x2="6" y2="18"',
      },
      {
        types: ["danger", "error"],
        marker: '<polygon points="13 2 3 14 12 14 11 22',
      },
      { types: ["bug"], marker: '<rect x="8" y="6"' },
      { types: ["example"], marker: '<line x1="8" y1="6" x2="21"' },
      { types: ["quote", "cite"], marker: 'd="M3 21c3 0 7-1 7-8V5' },
    ];

    for (const { types, marker } of iconFamilies) {
      for (const type of types) {
        const html = await renderRssMarkdown(`> [!${type}] 标题`);
        expect(html, `${type} icon`).toContain(marker);
      }
    }
  });

  it("handles heading ids and anchors per compile", async () => {
    const source = "# 重复！标题\n\n# 重复！标题\n\n# !!!";
    const first = await markdownToHtml(source, {
      features: markdownFeatures,
      mdastPlugins: pageMdastPlugins,
      hastPlugins: pageHastPlugins,
    });
    const second = await markdownToHtml("# 重复！标题", {
      features: markdownFeatures,
      mdastPlugins: pageMdastPlugins,
      hastPlugins: pageHastPlugins,
    });

    expect(first.html).toContain('id="重复标题"');
    expect(first.html).toContain('href="#重复标题"');
    expect(first.html).toContain('id="重复标题-1"');
    expect(first.html).toContain('href="#重复标题-1"');
    expect(first.html).toContain('id="section"');
    expect(first.html).toContain('aria-label="Link to section"');
    expect(first.html).not.toContain("aria-hidden");
    expect(first.html).not.toContain('tabindex="-1"');
    expect(second.html).toContain('id="重复标题"');
    expect(second.html).not.toContain('id="重复标题-1"');
    expect(first.html).not.toContain("properties=");
  });

  it("renders a readable code toolbar before client JavaScript runs", async () => {
    const result = await markdownToHtml("```ts\nconst answer = 42;\n```", {
      features: markdownFeatures,
      mdastPlugins: pageMdastPlugins,
      hastPlugins: pageHastPlugins,
    });
    const $ = load(result.html);
    const toolbar = $("[data-code-toolbar]").first();

    expect(toolbar.find("pre code").text()).toBe("const answer = 42;\n");
    expect(toolbar.find("pre").attr("tabindex")).toBe("0");
    expect(toolbar.find("[data-code-language]").text()).toBe("ts");
    expect(
      toolbar.find('[data-copy-button="true"]').attr("hidden")
    ).toBeDefined();
  });

  it("keeps figure behavior scoped to image-only paragraphs", async () => {
    const html = await renderRssMarkdown(
      '![alt caption](assets/1.png "title text")\n\ntext ![alt](assets/2.png)'
    );

    expect(html).toContain('<figure class="rehype-figure">');
    expect(html).toContain("<figcaption>alt caption</figcaption>");
    expect(html).toContain('title="title text"');
    expect(html).toContain("<p>text <img");
  });

  it("renders RSS media cards as plain links without JSX or heading anchors", async () => {
    const html = await renderRssMarkdown(
      "```card-book\nid: 987\ntitle: 测试书籍\nsource: douban\n```"
    );

    expect(html).toContain('href="https://book.douban.com/subject/987"');
    expect(html).toContain("书籍：《测试书籍》");
    expect(html).not.toContain("MediaCard");
    expect(html).not.toContain('href="#');
  });

  it("keeps all RSS media card types as readable ordinary links", async () => {
    for (const cardType of ["movie", "tv", "book", "music"] as const) {
      const html = await renderRssMarkdown(
        [
          `\`\`\`card-${cardType}`,
          "id: 987",
          `title: ${cardType} 标题`,
          "source: douban",
          "```",
        ].join("\n")
      );

      expect(html).toContain(`${cardType} 标题`);
      expect(html).toContain('target="_blank"');
      expect(html).not.toContain("MediaCard");
      expect(html).not.toContain("data-media-type");
      expect(html).not.toContain("<img");
    }
  });

  it("renders page MDX media cards as static intrinsic elements", async () => {
    const result = await mdxToJs(
      [
        "```card-book",
        "id: 987",
        "title: 测试书籍",
        "source: douban",
        "author: 作者",
        "rating: 8.7",
        "genres: 历史, 传记",
        "overview: 一段简介",
        "```",
      ].join("\n"),
      {
        features: markdownFeatures,
        mdastPlugins: pageMdastPlugins,
        hastPlugins: pageHastPlugins,
        jsx: true,
      }
    );

    expect(result.code).toContain("article");
    expect(result.code).toContain('data-media-type="book"');
    expect(result.code).toContain("测试书籍");
    expect(result.code).toContain("作者");
    expect(result.code).toContain("一段简介");
    expect(result.code).not.toContain("MediaCard");
  });

  it("parses media cards with field-specific types", () => {
    const parsed = parseCardContent(
      [
        "id: 00123",
        "title: 测试条目",
        "genres: 123",
        "poster: 456",
        "rating: 8.7",
        "runtime: 125",
        "pages: 320",
        "duration: 245",
        "overview: value: with colon",
        "unknown_numeric: 999",
        "malformed line",
      ].join("\n")
    );

    expect(parsed).toEqual({
      id: "00123",
      title: "测试条目",
      genres: "123",
      poster: "456",
      rating: 8.7,
      runtime: 125,
      pages: 320,
      duration: 245,
      overview: "value: with colon",
    });
  });

  it("rejects media card content without a title", () => {
    expect(parseCardContent("id: 123\nrating: 8.2")).toBeNull();
  });

  it("renders all page Markdown media card types as static cards", async () => {
    const renderer = await createSatteriMarkdownProcessor({
      features: markdownFeatures,
      mdastPlugins: pageMdastPlugins,
      hastPlugins: pageHastPlugins,
    });
    const cardTypes = ["movie", "tv", "book", "music"] as const;

    for (const cardType of cardTypes) {
      const result = await renderer.render(
        [
          `\`\`\`card-${cardType}`,
          "id: 987",
          `title: ${cardType} 标题`,
          "source: douban",
          "poster: https://images.example/poster.jpg",
          "release_date: 2024-01-02",
          "rating: 8.7",
          "genres: 类型一, 类型二",
          "overview: 主要简介",
          "```",
        ].join("\n"),
        { fileURL: fixtureUrl }
      );
      const $ = load(result.code);
      const card = $(`[data-media-type="${cardType}"]`);

      expect(card).toHaveLength(1);
      expect(card.find(".media-card__title").text()).toContain(
        `${cardType} 标题`
      );
      expect(card.find(".media-card__rating").text()).toContain("8.7");
      expect(card.find(".media-card__genre")).toHaveLength(2);
      expect(card.find(".media-card__overview").text()).toContain("主要简介");
      expect(result.code).not.toContain("MediaCard");
    }
  });

  it("keeps malformed cards as code and rejects dangerous card links", async () => {
    const renderer = await createSatteriMarkdownProcessor({
      features: markdownFeatures,
      mdastPlugins: pageMdastPlugins,
      hastPlugins: pageHastPlugins,
    });
    const result = await renderer.render(
      [
        "```card-book",
        "id: 987",
        "rating: 8.7",
        "```",
        "",
        "```card-movie",
        "id: 123",
        "title: 危险链接",
        "external_url: javascript:alert(1)",
        "```",
      ].join("\n"),
      { fileURL: fixtureUrl }
    );
    const $ = load(result.code);

    expect($("pre code").text()).toContain("rating: 8.7");
    expect($("[data-media-type=movie]")).toHaveLength(1);
    expect($("[data-media-type=movie] a")).toHaveLength(0);
    expect(result.code).not.toMatch(/href=["']javascript:/i);
  });

  it("marks cards without a usable poster as single-column content", async () => {
    const renderer = await createSatteriMarkdownProcessor({
      features: markdownFeatures,
      mdastPlugins: pageMdastPlugins,
      hastPlugins: pageHastPlugins,
    });
    const result = await renderer.render(
      [
        "```card-book",
        "id: 987",
        "title: 无海报卡片",
        "poster: javascript:alert(1)",
        "overview: 正文应该占满卡片宽度",
        "```",
      ].join("\n"),
      { fileURL: fixtureUrl }
    );
    const $ = load(result.code);
    const body = $("[data-media-type=book] .media-card__body");

    expect(body).toHaveLength(1);
    expect(body.hasClass("media-card__body--no-poster")).toBe(true);
    expect(body.attr("data-has-poster")).toBe("false");
    expect(body.find("img")).toHaveLength(0);
    expect(body.find(".media-card__title").text()).toContain("无海报卡片");
    expect(body.find(".media-card__overview").text()).toContain(
      "正文应该占满卡片宽度"
    );
  });

  it("resolves shorthand attachment posters relative to blog and snippet files", async () => {
    const renderer = await createSatteriMarkdownProcessor({
      features: markdownFeatures,
      mdastPlugins: pageMdastPlugins,
      hastPlugins: pageHastPlugins,
    });
    const source = [
      "```card-book",
      "id: 987",
      "title: 路径测试",
      "poster: attachments/poster.jpg",
      "```",
    ].join("\n");
    const blog = await renderer.render(source, {
      fileURL: new URL("file:///vault/src/data/blog/阅读/文章.mdx"),
    });
    const snippet = await renderer.render(source, {
      fileURL: new URL("file:///vault/src/data/snippets/2026/08/今天.md"),
    });
    const fixture = await renderer.render(source, {
      fileURL: postFixtureUrl,
    });

    expect(blog.metadata.localImagePaths).toEqual([
      "../../attachments/poster.jpg",
    ]);
    expect(snippet.metadata.localImagePaths).toEqual([
      "../../../attachments/poster.jpg",
    ]);
    expect(blog.code).toContain("../../attachments/poster.jpg");
    expect(snippet.code).toContain("../../../attachments/poster.jpg");
    expect(fixture.metadata.localImagePaths).toEqual([
      "../attachments/poster.jpg",
    ]);
    expect(fixture.code).toContain("../attachments/poster.jpg");
  });

  it("keeps shorthand posters authored when the source URL is not a file URL", async () => {
    const renderer = await createSatteriMarkdownProcessor({
      features: markdownFeatures,
      mdastPlugins: pageMdastPlugins,
      hastPlugins: pageHastPlugins,
    });
    const result = await renderer.render(
      [
        "```card-book",
        "id: 987",
        "title: 非文件 URL",
        "poster: attachments/poster.jpg",
        "```",
      ].join("\n"),
      { fileURL: new URL("https://example.test/posts/article.md") }
    );

    expect(result.metadata.localImagePaths).toEqual(["attachments/poster.jpg"]);
    expect(result.code).toContain("attachments/poster.jpg");
  });

  it("exposes non-empty plugin groups", () => {
    expect(pageMdastPlugins.length).toBeGreaterThan(0);
    expect(pageHastPlugins.length).toBeGreaterThan(0);
    expect(rssMdastPlugins.length).toBeGreaterThan(0);
    expect(rssHastPlugins.length).toBeGreaterThan(0);
  });

  it("covers duplicate title handling with an integration-level heading map", async () => {
    const renderer = await createSatteriMarkdownProcessor({
      features: markdownFeatures,
      mdastPlugins: pageMdastPlugins,
      hastPlugins: pageHastPlugins,
    });
    const result = await renderer.render("# 重复！标题\n\n## 重复！标题", {
      fileURL: fixtureUrl,
    });

    expect(result.metadata.headings).toEqual([
      { depth: 1, slug: "重复标题", text: "重复！标题" },
      { depth: 2, slug: "重复标题-1", text: "重复！标题" },
    ]);
    expect(result.code).toContain('href="#重复标题-1"');
  });

  it("covers page MDX integration with the page plugin chain", async () => {
    const result = await mdxToJs(
      [
        "# 重复！标题",
        "",
        "```card-book",
        "id: 987",
        "title: 测试书籍",
        "source: douban",
        "```",
      ].join("\n"),
      {
        features: markdownFeatures,
        mdastPlugins: pageMdastPlugins,
        hastPlugins: pageHastPlugins,
        jsx: true,
      }
    );

    expect(result.code).toContain('id="重复标题"');
    expect(result.code).toContain('href="#重复标题"');
    expect(result.code).toContain('data-media-type="book"');
    expect(result.code).toContain("测试书籍");
    expect(result.code).not.toContain("MediaCard");
  });

  it("renders Sätteri content containers as semantic server HTML", async () => {
    const html = await renderRssMarkdown(
      [
        ':::pullquote{cite="Ada Lovelace"}',
        "**想象力**是发现的能力。",
        ":::",
        "",
        ':::gallery{layout="grid" columns="2"}',
        "![湖面](assets/lake.png) ![山脊](assets/ridge.png)",
        ":::",
        "",
        ":::timeline",
        "- **2024** 发布",
        "- 2025 迭代",
        ":::",
        "",
        ':::aside{title="背景" variant="note"}',
        "保留 [Markdown 链接](https://example.com)。",
        ":::",
        "",
        ":::stats",
        "- 文章: **42**",
        "- 城市：8",
        ":::",
        "",
        ':::map{title="杭州" latitude="30.27" longitude="120.15" zoom="8"}',
        "浙江杭州",
        ":::",
        "",
        ':::map{label="原点" latitude="0" longitude="0" zoom="0"}',
        "坐标原点",
        ":::",
      ].join("\n")
    );
    const $ = load(html);

    const pullquote = $('figure[data-content-component="pullquote"]');
    expect(pullquote.hasClass("content-block--pullquote")).toBe(true);
    expect(pullquote.find("blockquote strong").text()).toBe("想象力");
    expect(pullquote.find("figcaption").text()).toBe("Ada Lovelace");

    const gallery = $('div[data-content-component="gallery"]');
    expect(gallery.attr("data-layout")).toBe("grid");
    expect(gallery.attr("data-columns")).toBe("2");
    expect(gallery.find("figure img")).toHaveLength(2);

    const timeline = $('ol[data-content-component="timeline"]');
    expect(timeline.children("li")).toHaveLength(2);
    expect(timeline.children("ul, ol")).toHaveLength(0);

    const aside = $('aside[data-content-component="aside"]');
    expect(aside.attr("data-title")).toBe("背景");
    expect(aside.find("a").attr("href")).toBe("https://example.com");

    const stats = $('dl[data-content-component="stats"]');
    expect(
      stats
        .children("dt")
        .map((_, node) => $(node).text())
        .get()
    ).toEqual(["文章", "城市"]);
    expect(
      stats
        .children("dd")
        .map((_, node) => $(node).text())
        .get()
    ).toEqual(["42", "8"]);

    const map = $('section[data-content-component="map"]');
    expect(map.attr("role")).toBe("group");
    expect(map.attr("aria-label")).toBe("杭州");
    expect(map.attr("data-latitude")).toBe("30.27");
    expect(map.attr("data-longitude")).toBe("120.15");
    expect(map.attr("data-zoom")).toBe("8");
    const zeroMap = $('section[data-content-component="map"]').eq(1);
    expect(zeroMap.attr("data-latitude")).toBe("0");
    expect(zeroMap.attr("data-longitude")).toBe("0");
    expect(zeroMap.attr("data-zoom")).toBe("0");
    expect($("script")).toHaveLength(0);
  });

  it("whitelists content-container attributes and preserves unknown directives", async () => {
    const html = await renderRssMarkdown(
      [
        ':::map{title="<img src=x>" layout="grid onmouseover=alert(1)" latitude="999" onclick="alert(1)"}',
        "安全正文",
        ":::",
        "",
        ":::unknown-widget",
        "未知组件 <script>alert(1)</script>",
        ":::",
      ].join("\n")
    );
    const $ = load(html);
    const map = $('[data-content-component="map"]');

    expect(map.attr("data-title")).toBe("<img src=x>");
    expect(map.attr("data-layout")).toBeUndefined();
    expect(map.attr("data-latitude")).toBeUndefined();
    expect(map.attr("onclick")).toBeUndefined();
    expect(map.find("img, script")).toHaveLength(0);
    expect($("pre code").text()).toContain(":::unknown-widget");
    expect($("pre code").text()).toContain(
      "未知组件 <script>alert(1)</script>"
    );
    expect($("script")).toHaveLength(0);
  });

  it("compiles content containers to intrinsic MDX elements without component hydration", async () => {
    const result = await mdxToJs(":::aside\n静态内容\n:::", {
      features: markdownFeatures,
      mdastPlugins: pageMdastPlugins,
      hastPlugins: pageHastPlugins,
      jsx: true,
    });

    expect(result.code).toContain('data-content-component="aside"');
    expect(result.code).toContain("<_components.aside");
    expect(result.code).not.toContain("ContentComponent");
    expect(result.code).not.toContain("client:");
  });
});
