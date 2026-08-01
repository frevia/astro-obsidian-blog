import { describe, expect, it } from "vitest";

import { tplStr, useTranslations } from "./index";

describe("i18n", () => {
  it("returns the requested locale", () => {
    expect(useTranslations("zh-CN").nav.posts).toBe("文章");
    expect(useTranslations("zh-CN").notFound.goHome).toBe("返回「时间档案」");
  });

  it("matches BCP47 locale casing insensitively", () => {
    expect(useTranslations("zh-cn").nav.posts).toBe("文章");
    expect(useTranslations("ZH-cn").nav.posts).toBe("文章");
  });

  it("falls back to English for unknown locales", () => {
    expect(useTranslations("missing-locale")).toBe(useTranslations("en"));
  });

  it("replaces template placeholders", () => {
    expect(
      tplStr(useTranslations("en").post.sharePostOn, { platform: "X" })
    ).toBe("Share this post on X");
    expect(
      tplStr("第 {{page}} 页，共 {{total}} 页", { page: 2, total: 5 })
    ).toBe("第 2 页，共 5 页");
  });
});
