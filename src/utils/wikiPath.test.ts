import { describe, expect, it } from "vitest";

import {
  getWikiDescription,
  getWikiPath,
  getWikiTitle,
  wikiRouteId,
} from "./wikiPath";

describe("wiki paths and metadata", () => {
  it("matches Astro glob loader ids while retaining hierarchy", () => {
    expect(wikiRouteId("concepts/ASN.1与DER.md")).toBe("concepts/asn1与der");
    expect(wikiRouteId("concepts/公钥基础设施（PKI）.md")).toBe(
      "concepts/公钥基础设施pki"
    );
    expect(getWikiPath("concepts/数字证书.md", false)).toBe(
      "/wiki/concepts/数字证书"
    );
  });

  it("falls back to the first H1 and paragraph for source-shaped pages", () => {
    const entry = {
      id: "concepts/example",
      body: "# 示例知识页\n\n这是一个持续更新的说明。",
      data: {},
    };
    expect(getWikiTitle(entry)).toBe("示例知识页");
    expect(getWikiDescription(entry)).toBe("这是一个持续更新的说明。");
  });
});
