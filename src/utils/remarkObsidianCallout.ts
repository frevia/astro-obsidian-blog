import type { Root, Blockquote, Paragraph, Text } from "mdast";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";

function toKebabCase(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function toTitleCase(input: string) {
  const normalized = input.trim().replace(/[-_]+/g, " ");
  return normalized.replace(/\b([a-z])/g, (_, c: string) => c.toUpperCase());
}

function mergeClassName(
  existing: unknown,
  toAdd: string[]
): Array<string> | string {
  if (Array.isArray(existing))
    return Array.from(new Set([...existing, ...toAdd]));
  if (typeof existing === "string")
    return Array.from(new Set([existing, ...toAdd].filter(Boolean)));
  return toAdd;
}

export const remarkObsidianCallout: Plugin<[], Root> = () => {
  return tree => {
    visit(tree, "blockquote", (node: Blockquote) => {
      const first = node.children[0];
      if (!first || first.type !== "paragraph") return;

      const titleParagraph = first as Paragraph;
      const firstInline = titleParagraph.children[0];
      if (!firstInline || firstInline.type !== "text") return;

      const firstText = firstInline as Text;
      const match = firstText.value.match(/^\s*\[!([^\]]+)\]([+-])?\s*/);
      if (!match) return;

      const rawType = match[1];
      const fold = match[2] ?? "";
      const calloutType = toKebabCase(rawType);

      const remaining = firstText.value.slice(match[0].length);
      if (remaining) firstText.value = remaining;
      else titleParagraph.children.shift();

      if (titleParagraph.children.length === 0) {
        titleParagraph.children = [
          { type: "text", value: toTitleCase(rawType) },
        ];
      }

      titleParagraph.data ??= {};
      titleParagraph.data.hProperties ??= {};
      const tpProps = titleParagraph.data.hProperties as Record<
        string,
        unknown
      >;
      tpProps.className = mergeClassName(tpProps.className, ["callout-title"]);

      node.data ??= {};
      node.data.hProperties ??= {};
      const bqProps = node.data.hProperties as Record<string, unknown>;
      bqProps.className = mergeClassName(bqProps.className, [
        "callout",
        `callout-${calloutType}`,
      ]);
      bqProps["data-callout"] = calloutType;
      if (fold) bqProps["data-callout-fold"] = fold;
    });
  };
};

export default remarkObsidianCallout;
