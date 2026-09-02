import { describe, expect, it } from "vitest";
import type { WikilinkGraph, WikilinkReference } from "./wikilinkGraph";
import {
  buildWikiCatalog,
  getWikiDomain,
  selectWikiHighlights,
  WIKI_DOMAINS,
} from "./wikiCatalog";

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

const reference = (id: string): WikilinkReference => ({
  id,
  title: id,
  slug: id,
  href: `/wiki/${id}`,
  label: id,
});

const graph: WikilinkGraph = {
  outgoing: new Map([
    ["concepts/信任链.md", [reference("concepts/数字证书.md")]],
    ["concepts/数字证书.md", [reference("concepts/信任链.md")]],
    ["concepts/主动提取.md", []],
  ]),
  backlinks: new Map([
    ["concepts/信任链.md", [reference("concepts/数字签名.md")]],
    ["concepts/数字证书.md", [reference("concepts/信任链.md")]],
  ]),
};

const entries = [
  {
    id: "concepts/信任链.md",
    body: "",
    data: { title: "信任链", description: "从根到叶的信任关系。" },
  },
  {
    id: "concepts/数字证书.md",
    body: "",
    data: { title: "数字证书", description: "绑定身份与公钥。" },
  },
  {
    id: "concepts/主动提取.md",
    body: "",
    data: { title: "主动提取", description: "让学习形成反馈。" },
  },
];

describe("wiki catalog", () => {
  it("enriches entries with descriptions, domains, relations, and paths", () => {
    const catalog = buildWikiCatalog(entries, graph);
    const trustChain = catalog.find(item => item.title === "信任链");

    expect(trustChain).toMatchObject({
      id: "concepts/信任链.md",
      description: "从根到叶的信任关系。",
      domain: WIKI_DOMAINS[0],
      relations: 2,
      href: "/wiki/concepts/信任链",
    });
  });

  it("selects a stable relation-first highlight list without mutating the catalog", () => {
    const catalog = buildWikiCatalog(entries, graph);
    const before = catalog.map(item => item.id);
    const first = selectWikiHighlights(catalog, 2).map(item => item.id);
    const second = selectWikiHighlights(catalog, 2).map(item => item.id);

    expect(first).toEqual(second);
    expect(first).toEqual(["concepts/数字证书.md", "concepts/信任链.md"]);
    expect(catalog.map(item => item.id)).toEqual(before);
  });

  it("honors the limit and returns an empty list for empty or zero input", () => {
    const catalog = buildWikiCatalog(entries, graph);

    expect(selectWikiHighlights(catalog, 1)).toHaveLength(1);
    expect(selectWikiHighlights(catalog, 0)).toEqual([]);
    expect(selectWikiHighlights([], 3)).toEqual([]);
  });
});
