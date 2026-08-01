import { defineHastPlugin, defineMdastPlugin } from "satteri";
import type { Blockquote, Paragraph, Text } from "mdast";
import type { Element, ElementContent } from "hast";
import type { HastPluginDefinition, MdastPluginDefinition } from "satteri";

const marker = /^\[!([a-zA-Z0-9_-]+)\]([+-]?)/;

function pathIcon(pathD: string): Element {
  return {
    type: "element",
    tagName: "svg",
    properties: {
      xmlns: "http://www.w3.org/2000/svg",
      width: 24,
      height: 24,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": 2,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    },
    children: [
      {
        type: "element",
        tagName: "path",
        properties: { d: pathD },
        children: [],
      },
    ],
  };
}

const icons: Record<string, Element> = {
  note: pathIcon("M7.5 20.5 19 9l-4-4L3.5 16.5 2 22z"),
  warning: pathIcon(
    "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"
  ),
  error: pathIcon("M18 6 6 18M6 6l12 12"),
  danger: pathIcon("M13 2 3 14h9l-1 8 10-12h-9l1-8Z"),
  tip: pathIcon(
    "M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5Z"
  ),
};

const defaultIcon: Element = {
  type: "element",
  tagName: "svg",
  properties: {
    xmlns: "http://www.w3.org/2000/svg",
    width: 24,
    height: 24,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": 2,
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
  },
  children: [
    {
      type: "element",
      tagName: "circle",
      properties: { cx: 12, cy: 12, r: 10 },
      children: [],
    },
    {
      type: "element",
      tagName: "line",
      properties: { x1: 12, y1: 16, x2: 12, y2: 12 },
      children: [],
    },
    {
      type: "element",
      tagName: "line",
      properties: { x1: 12, y1: 8, x2: 12.01, y2: 8 },
      children: [],
    },
  ],
};

function asTextChild(child: Paragraph["children"][number]): Text | undefined {
  return child.type === "text" ? child : undefined;
}

export const calloutMdastPlugin: MdastPluginDefinition = defineMdastPlugin({
  name: "callout-mdast",
  blockquote(node: Readonly<Blockquote>, ctx) {
    const first = node.children[0];
    if (first?.type !== "paragraph") return;

    const paragraph = first as Paragraph;
    const textIndex = paragraph.children.findIndex(
      child => child.type === "text"
    );
    if (textIndex === -1) return;

    const textNode = asTextChild(paragraph.children[textIndex]);
    const matched = textNode?.value.match(marker);
    if (!textNode || !matched) return;

    const calloutType = matched[1].toLowerCase();
    const expandSign = matched[2] || "";
    const withoutMarker = textNode.value
      .slice(matched[0].length)
      .replace(/^\s*/, "");
    const lineBreakIndex = withoutMarker.indexOf("\n");
    const title =
      lineBreakIndex >= 0
        ? withoutMarker.slice(0, lineBreakIndex).trim()
        : withoutMarker.trim();
    const contentStart =
      lineBreakIndex >= 0 ? withoutMarker.slice(lineBreakIndex + 1) : "";

    const nextParagraphChildren = [...paragraph.children];
    if (contentStart) {
      nextParagraphChildren[textIndex] = { ...textNode, value: contentStart };
    } else {
      nextParagraphChildren.splice(textIndex, 1);
    }

    const nextBlockquoteChildren = [...node.children];
    if (nextParagraphChildren.length) {
      nextBlockquoteChildren[0] = {
        ...paragraph,
        children: nextParagraphChildren,
      };
    } else {
      nextBlockquoteChildren.shift();
    }

    ctx.setProperty(node, "children", nextBlockquoteChildren);
    ctx.setProperty(node, "data", {
      ...node.data,
      hProperties: {
        ...((node.data?.hProperties as Record<string, unknown>) ?? {}),
        className: ["callout", `callout-${calloutType}`],
        "data-callout": calloutType,
        "data-expandable": String(Boolean(expandSign)),
        "data-expanded": String(expandSign === "+"),
        "data-callout-title": title,
      },
    });
  },
});

export const calloutHastPlugin: HastPluginDefinition = defineHastPlugin({
  name: "callout-hast",
  element: {
    filter: ["blockquote"],
    visit(node: Readonly<Element>, ctx) {
      const calloutType = node.properties["data-callout"];
      if (!calloutType) return;

      const rawTitle = node.properties["data-callout-title"];
      ctx.setProperty(node, "data-callout-title", null);

      const titleText = typeof rawTitle === "string" ? rawTitle : "";
      const iconNode =
        typeof calloutType === "string"
          ? (icons[calloutType] ?? defaultIcon)
          : defaultIcon;
      const titleChildren: ElementContent[] = [
        {
          type: "element",
          tagName: "div",
          properties: { className: ["callout-title-icon"] },
          children: [iconNode],
        },
      ];

      if (titleText) {
        titleChildren.push({
          type: "element",
          tagName: "div",
          properties: { className: ["callout-title-text"] },
          children: [{ type: "text", value: titleText }],
        });
      }

      ctx.prependChild(node, {
        type: "element",
        tagName: "div",
        properties: { className: ["callout-title"] },
        children: titleChildren,
      });
    },
  },
});
