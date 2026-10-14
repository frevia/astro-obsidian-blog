import { markdownToMdast } from "satteri";

interface TextNode {
  type: string;
  value?: string;
  children?: TextNode[];
}

const inlineNodes = new Set([
  "text",
  "inlineCode",
  "strong",
  "emphasis",
  "delete",
  "link",
  "linkReference",
]);

function bodyText(node: TextNode): string {
  if (node.type === "text" || node.type === "inlineCode")
    return node.value ?? "";
  if (!node.children) return "";
  const text = node.children.map(bodyText).join("");
  return inlineNodes.has(node.type) ? text : `\n${text}\n`;
}

/** Count prose: CJK characters individually, other words/numbers as units.
 * Code blocks, media-card configuration, images and frontmatter are not prose.
 */
export async function countContentWords(markdown: string): Promise<number> {
  const tree = await markdownToMdast(markdown, {
    features: { gfm: true, frontmatter: true, wikilinks: true, math: true },
  });
  const text = bodyText(tree)
    .replace(/\[![a-zA-Z0-9_-]+\][+-]?/g, "")
    .replace(/https?:\/\/[^\s<>]+/g, "");
  const cjk =
    /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu;
  const characters = text.match(cjk)?.length ?? 0;
  const words =
    text.replace(cjk, " ").match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu)
      ?.length ?? 0;
  return characters + words;
}
