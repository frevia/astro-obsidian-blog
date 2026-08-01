import { describe, expect, it } from "vitest";
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

describe("processor contract", () => {
  it("renders RSS callouts with preserved type, title, and body", async () => {
    const html = await renderRssMarkdown("> [!note] RSS标题\n> 正文");

    expect(html).toContain("RSS标题");
    expect(html).toContain("正文");
    expect(html).toContain("callout");
  });

  it("resolves wikilinks and attachment images from Chinese paths in RSS rendering", async () => {
    const html = await renderRssMarkdown(
      "链接 [[posts/中文页面|中文标题]]，附件 ![[assets/图像.png]]",
      { fileURL: fixtureUrl }
    );

    expect(html).toContain('href="/posts/zh-page"');
    expect(html).toContain("中文标题");
    expect(html).toContain('src="assets/%E5%9B%BE%E5%83%8F.png"');
    expect(html).toContain('alt="图像"');
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

  it("renders page MDX media cards as component calls", async () => {
    const result = await mdxToJs(
      "```card-book\nid: 987\ntitle: 测试书籍\nsource: douban\n```",
      {
        features: markdownFeatures,
        mdastPlugins: pageMdastPlugins,
        hastPlugins: pageHastPlugins,
        jsx: true,
      }
    );

    expect(result.code).toContain("MediaCard");
    expect(result.code).toContain('cardType="book"');
    expect(result.code).toContain('"title":"测试书籍"');
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
    expect(result.code).toContain("MediaCard");
  });
});
