import type { Root, Text, Break } from "mdast";
import type { Plugin } from "unified";
import type { Parent } from "unist";
import { visit } from "unist-util-visit";

export const remarkHardLineBreaks: Plugin<[], Root> = () => {
  return tree => {
    visit(tree, "text", (node: Text, index?: number, parent?: Parent) => {
      if (!parent || index === undefined) return;
      if (!node.value.includes("\n")) return;

      const parts = node.value.split(/\n/);
      const nextNodes: Array<Text | Break> = [];

      parts.forEach((part, i) => {
        if (part) nextNodes.push({ type: "text", value: part });
        if (i < parts.length - 1) nextNodes.push({ type: "break" });
      });

      if (nextNodes.length === 0) return;

      (parent.children as unknown[]).splice(index, 1, ...nextNodes);
      return index + nextNodes.length;
    });
  };
};

export default remarkHardLineBreaks;
