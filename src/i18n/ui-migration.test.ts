import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readSource = (path: string) =>
  readFileSync(resolve(import.meta.dirname, "../..", path), "utf-8");

describe("UI i18n migration", () => {
  const translatedAstroFiles = [
    "src/components/Header.astro",
    "src/components/Footer.astro",
    "src/components/Pagination.astro",
    "src/components/BackButton.astro",
    "src/components/EditPost.astro",
    "src/components/ShareLinks.astro",
    "src/components/Datetime.astro",
    "src/layouts/PostDetails.astro",
    "src/pages/404.astro",
    "src/pages/search.astro",
    "src/pages/posts/[...page].astro",
    "src/pages/posts/[tag]/[...page].astro",
    "src/pages/tags/index.astro",
    "src/pages/archives/index.astro",
  ];

  it("loads typed UI translations in migrated Astro components and pages", () => {
    for (const path of translatedAstroFiles) {
      const source = readSource(path);

      expect(source, path).toMatch(/import\s+\{[^}]*useTranslations[^}]*\}/);
      expect(source, path).toContain("useTranslations(SITE.lang)");
    }
  });

  it("keeps header labels and client menu state sourced from translated strings", () => {
    const source = readSource("src/components/Header.astro");

    expect(source).toContain("const headerLabels = {");
    expect(source).toContain("data-open-label={headerLabels.openMenu}");
    expect(source).toContain("data-close-label={headerLabels.closeMenu}");
    expect(source).toContain('menuBtn.dataset.openLabel ?? ""');
    expect(source).toContain('menuBtn.dataset.closeLabel ?? ""');
    expect(source).not.toContain(
      'setAttribute("aria-label", isOpen ? "打开菜单" : "关闭菜单")'
    );
    expect(source).not.toContain(
      'setAttribute("aria-label", isOpen ? "关闭菜单" : "打开菜单")'
    );
  });

  it("passes localized Pagefind search strings through component attributes", () => {
    const source = readSource("src/pages/search.astro");

    expect(source).toContain("const searchLabels = {");
    expect(source).toContain("browserTitle: t.pages.searchBrowserTitle");
    expect(source).toContain('"show-sub-results": true');
    expect(source).toContain("placeholder: searchLabels.placeholder");
    expect(source).not.toContain('pageTitle="搜索"');
    expect(source).not.toContain('pageDesc="搜索你想了解的内容..."');
  });

  it("preserves existing Chinese visible strings through zh-CN UI keys", () => {
    const source = readSource("src/i18n/lang/zh-CN.ts");

    expect(source).toContain('skipToContent: "跳到主要内容"');
    expect(source).toContain('sharePostIntro: "分享链接:"');
    expect(source).toContain('notFoundBrowserTitle: "404 Not Found"');
    expect(source).toContain('searchBrowserTitle: "搜索"');
    expect(source).toContain('archivesTooltip: "Archives"');
    expect(source).toContain('searchTooltip: "Search"');
    expect(source).toContain('tagPageTitleCompact: "标签:{{tag}}"');
  });

  it("keeps configurable edit text and custom share titles before i18n fallbacks", () => {
    const editPost = readSource("src/components/EditPost.astro");
    const shareLinks = readSource("src/components/ShareLinks.astro");

    expect(editPost).toContain("SITE.editPost.text || t.post.editPage");
    expect(shareLinks).toContain("const getShareLinkTitle =");
    expect(shareLinks).toContain(
      "if (social.linkTitle) return social.linkTitle"
    );
    expect(shareLinks).toContain('social.name.toLowerCase() === "mail"');
    expect(shareLinks).toContain("return t.post.sharePostViaEmail");
    expect(shareLinks).toContain("return tplStr(t.post.sharePostOn");
  });

  it("encodes full current URLs before appending them to share targets", () => {
    const shareLinks = readSource("src/components/ShareLinks.astro");
    const currentUrl = "https://example.test/post?q=a&b=two#section";

    expect(encodeURIComponent(currentUrl)).toBe(
      "https%3A%2F%2Fexample.test%2Fpost%3Fq%3Da%26b%3Dtwo%23section"
    );
    expect(shareLinks).toContain(
      "const encodedCurrentUrl = encodeURIComponent(URL.href)"
    );
    expect(shareLinks).toContain("href={`${social.href}${encodedCurrentUrl}`}");
    expect(shareLinks).not.toContain("href={`${social.href + URL}`}");
  });

  it("bridges code-copy button labels into PostDetails client script", () => {
    const source = readSource("src/layouts/PostDetails.astro");

    expect(source).toContain("const postDetailsLabels = {");
    expect(source).toContain("data-copy-label={postDetailsLabels.copyCode}");
    expect(source).toContain(
      "data-copied-label={postDetailsLabels.copiedCode}"
    );
    expect(source).toContain("const copyLabel = main.dataset.copyLabel;");
    expect(source).toContain("const copiedLabel = main.dataset.copiedLabel;");
    expect(source).toContain("if (!copyLabel || !copiedLabel) return;");
    expect(source).not.toContain('copyButton.textContent = "复制"');
    expect(source).not.toContain('copyButton.textContent = "已复制"');
    expect(source).not.toContain('"Copy"');
    expect(source).not.toContain('"Copied"');
  });
});
