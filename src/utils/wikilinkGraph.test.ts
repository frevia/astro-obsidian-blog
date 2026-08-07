import { describe, expect, it } from "vitest";

import {
  buildWikilinkGraph,
  extractWikilinkTargets,
  type WikilinkEntry,
} from "./wikilinkGraph";
import { withBase } from "./withBase";

const entries: WikilinkEntry[] = [
  {
    id: "astro-7",
    data: { title: "Astro 7" },
    body: "See [[design-notes|the design notes]] and [[guide#Hydration]]. `[[ignored]]`\n```md\n[[also-ignored]]\n```",
  },
  {
    id: "design-notes",
    data: { title: "Design notes" },
    body: "Related: [[astro-7]].",
  },
  {
    id: "guide",
    data: { title: "Guide" },
    body: "![[cover.png]]",
  },
];

describe("extractWikilinkTargets", () => {
  it("ignores embeds and code while retaining aliases/headings", () => {
    expect(extractWikilinkTargets(entries[0].body)).toEqual([
      { target: "design-notes", label: "the design notes" },
      { target: "guide", heading: "Hydration", label: "guide" },
    ]);
  });

  it("ignores escaped links and comments and preserves the complete alias", () => {
    expect(
      extractWikilinkTargets(
        String.raw`\[[escaped]] ![[embed]] <!-- [[comment]] --> \`\`[[code]]\`\` [[Folder/Note.md|Alias | with pipe]]`
      )
    ).toEqual([
      {
        target: "Folder/Note.md",
        label: "Alias | with pipe",
      },
    ]);
  });
});

describe("buildWikilinkGraph", () => {
  it("builds reverse links and stable post URLs", () => {
    const graph = buildWikilinkGraph(entries);
    expect(graph.outgoing.get("astro-7")).toEqual([
      expect.objectContaining({
        id: "design-notes",
        href: "/posts/design-notes",
        label: "the design notes",
      }),
      expect.objectContaining({ id: "guide", href: "/posts/guide#hydration" }),
    ]);
    expect(graph.backlinks.get("astro-7")).toEqual([
      expect.objectContaining({
        id: "design-notes",
        href: "/posts/design-notes",
      }),
    ]);
  });

  it("uses the routed collection id while keeping frontmatter slug as an alias", () => {
    const graph = buildWikilinkGraph([
      {
        id: "source",
        data: { title: "Source" },
        body: "[[FRONTMATTER-ALIAS#API & HTML <script>]]",
      },
      {
        id: "folder/Route ID%20",
        data: {
          title: '<img src=x onerror="alert(1)">',
          slug: "frontmatter-alias",
        },
      },
    ]);

    const [reference] = graph.outgoing.get("source") ?? [];
    expect(reference).toMatchObject({
      slug: "Route ID%20",
      href: "/posts/Route%20ID%2520#api--html-script",
    });
    expect(reference?.href).not.toContain("<script>");
    expect(withBase(reference?.href ?? "", "/knowledge")).toBe(
      "/knowledge/posts/Route%20ID%2520#api--html-script"
    );
  });

  it("normalizes encoded extensions, Unicode, and malformed URI escapes", () => {
    const decomposedTitle = "Cafe\u0301";
    const graph = buildWikilinkGraph([
      {
        id: "source",
        data: { title: "Source" },
        body: "[[Caf%C3%A9.mdx]] [[100% ready]]",
      },
      { id: decomposedTitle, data: { title: "Café" } },
      { id: "100% ready", data: { title: "Ready" } },
    ]);

    expect(graph.outgoing.get("source")?.map(link => link.href)).toEqual([
      "/posts/Cafe%CC%81",
      "/posts/100%25%20ready",
    ]);
  });

  it("does not guess ambiguous basenames but resolves qualified and relative paths", () => {
    const graph = buildWikilinkGraph([
      {
        id: "guides/topic/source",
        data: { title: "Source" },
        body: "[[shared]] [[other/shared]] [[../shared]]",
      },
      { id: "guides/shared", data: { title: "Guide shared" } },
      { id: "other/shared", data: { title: "Other shared" } },
    ]);

    expect(
      graph.outgoing.get("guides/topic/source")?.map(link => link.id)
    ).toEqual(["other/shared", "guides/shared"]);
  });

  it("keeps wiki hierarchy and route prefixes when public entries are mixed", () => {
    const graph = buildWikilinkGraph([
      {
        id: "技术/source",
        routePrefix: "/posts",
        data: { title: "公开文章" },
        body: "参见 [[concepts/数字证书]]。",
      },
      {
        id: "concepts/数字证书",
        routePrefix: "/wiki",
        data: { title: "数字证书" },
        body: "参见 [[concepts/信任链]]。",
      },
      {
        id: "concepts/信任链",
        routePrefix: "/wiki",
        data: { title: "信任链" },
        body: "[[private/未公开页面]]",
      },
    ]);

    expect(graph.outgoing.get("技术/source")).toEqual([
      expect.objectContaining({
        id: "concepts/数字证书",
        href: "/wiki/concepts/数字证书",
      }),
    ]);
    expect(graph.outgoing.get("concepts/数字证书")).toEqual([
      expect.objectContaining({
        id: "concepts/信任链",
        href: "/wiki/concepts/信任链",
      }),
    ]);
    expect(graph.outgoing.get("concepts/信任链")).toEqual([]);
    expect(graph.backlinks.get("concepts/数字证书")).toEqual([
      expect.objectContaining({
        id: "技术/source",
        href: "/posts/source",
      }),
    ]);
  });

  it("reuses an equivalent graph and invalidates the cache on content changes", () => {
    const firstEntries: WikilinkEntry[] = [
      { id: "cache-source", data: { title: "Source" }, body: "[[target]]" },
      { id: "target", data: { title: "Target" } },
    ];
    const equivalentEntries = firstEntries.map(entry => ({
      ...entry,
      data: { ...entry.data },
    }));

    const firstGraph = buildWikilinkGraph(firstEntries);
    expect(buildWikilinkGraph(equivalentEntries)).toBe(firstGraph);

    const changedGraph = buildWikilinkGraph([
      { ...equivalentEntries[0], body: "No links" },
      equivalentEntries[1],
    ]);
    expect(changedGraph).not.toBe(firstGraph);
    expect(changedGraph.outgoing.get("cache-source")).toEqual([]);
  });
});
