import { describe, expect, it } from "vitest";
import { getWikiDomain, WIKI_DOMAINS } from "./wikiCatalog";

describe("wiki catalog taxonomy", () => {
  it("keeps four stable public domains", () => {
    expect(WIKI_DOMAINS.map(domain => domain.key)).toEqual([
      "trust",
      "learning",
      "thinking",
      "living",
    ]);
  });

  it.each([
    ["公钥基础设施（PKI）", "trust"],
    ["主动提取与技能自动化", "learning"],
    ["独立思考与信息过滤", "thinking"],
    ["书写疗愈", "living"],
  ])("maps %s into %s", (title, expected) => {
    expect(getWikiDomain(title).key).toBe(expected);
  });
});
