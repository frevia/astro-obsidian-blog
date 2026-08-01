import { defineHastPlugin, defineMdastPlugin } from "satteri";
import type { Blockquote, Paragraph, Text } from "mdast";
import type { Element, ElementContent } from "hast";
import type { HastPluginDefinition, MdastPluginDefinition } from "satteri";

const marker = /^\[!([a-zA-Z0-9_-]+)\]([+-]?)/;

function iconChild(
  tagName: string,
  properties: Element["properties"]
): Element {
  return {
    type: "element",
    tagName,
    properties,
    children: [],
  };
}

function svgIcon(children: Element[]): Element {
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
    children,
  };
}

function pathIcon(pathD: string): Element {
  return svgIcon([iconChild("path", { d: pathD })]);
}

const infoIcon = () =>
  svgIcon([
    iconChild("circle", { cx: 12, cy: 12, r: 10 }),
    iconChild("line", { x1: 12, y1: 16, x2: 12, y2: 12 }),
    iconChild("line", { x1: 12, y1: 8, x2: 12.01, y2: 8 }),
  ]);
const pencilIcon = () => pathIcon("M7.5 20.5 19 9l-4-4L3.5 16.5 2 22z");
const clipboardListIcon = () =>
  svgIcon([
    iconChild("rect", { x: 8, y: 2, width: 8, height: 4, rx: 1, ry: 1 }),
    iconChild("path", {
      d: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2",
    }),
    iconChild("path", { d: "M12 11h4" }),
    iconChild("path", { d: "M12 16h4" }),
    iconChild("path", { d: "M8 11h.01" }),
    iconChild("path", { d: "M8 16h.01" }),
  ]);
const checkCircleIcon = () =>
  svgIcon([
    iconChild("path", {
      d: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z",
    }),
    iconChild("path", { d: "m9 12 2 2 4-4" }),
  ]);
const flameIcon = () =>
  pathIcon(
    "M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5Z"
  );
const checkIcon = () =>
  svgIcon([iconChild("polyline", { points: "20 6 9 17 4 12" })]);
const helpCircleIcon = () =>
  svgIcon([
    iconChild("circle", { cx: 12, cy: 12, r: 10 }),
    iconChild("path", { d: "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" }),
    iconChild("line", { x1: 12, y1: 17, x2: 12.01, y2: 17 }),
  ]);
const warningIcon = () =>
  svgIcon([
    iconChild("path", {
      d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z",
    }),
    iconChild("line", { x1: 12, y1: 9, x2: 12, y2: 13 }),
    iconChild("line", { x1: 12, y1: 17, x2: 12.01, y2: 17 }),
  ]);
const xIcon = () =>
  svgIcon([
    iconChild("line", { x1: 18, y1: 6, x2: 6, y2: 18 }),
    iconChild("line", { x1: 6, y1: 6, x2: 18, y2: 18 }),
  ]);
const zapIcon = () =>
  svgIcon([
    iconChild("polygon", { points: "13 2 3 14 12 14 11 22 21 10 12 10 13 2" }),
  ]);
const bugIcon = () =>
  svgIcon([
    iconChild("rect", { x: 8, y: 6, width: 8, height: 14, rx: 4 }),
    ...[
      "m19 7-3 2",
      "m5 7 3 2",
      "m19 19-3-2",
      "m5 19 3-2",
      "M20 13h-4",
      "M4 13h4",
      "m10 4 1 2",
      "m14 4-1 2",
    ].map(d => iconChild("path", { d })),
  ]);
const listIcon = () =>
  svgIcon([
    iconChild("line", { x1: 8, y1: 6, x2: 21, y2: 6 }),
    iconChild("line", { x1: 8, y1: 12, x2: 21, y2: 12 }),
    iconChild("line", { x1: 8, y1: 18, x2: 21, y2: 18 }),
    iconChild("line", { x1: 3, y1: 6, x2: 3.01, y2: 6 }),
    iconChild("line", { x1: 3, y1: 12, x2: 3.01, y2: 12 }),
    iconChild("line", { x1: 3, y1: 18, x2: 3.01, y2: 18 }),
  ]);
const quoteIcon = () =>
  svgIcon([
    iconChild("path", {
      d: "M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z",
    }),
    iconChild("path", {
      d: "M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z",
    }),
  ]);

type IconFactory = () => Element;

const icons: Record<string, IconFactory> = {
  note: pencilIcon,
  abstract: clipboardListIcon,
  summary: clipboardListIcon,
  tldr: clipboardListIcon,
  info: infoIcon,
  todo: checkCircleIcon,
  tip: flameIcon,
  hint: flameIcon,
  important: flameIcon,
  success: checkIcon,
  check: checkIcon,
  done: checkIcon,
  question: helpCircleIcon,
  help: helpCircleIcon,
  faq: helpCircleIcon,
  warning: warningIcon,
  attention: warningIcon,
  caution: warningIcon,
  failure: xIcon,
  missing: xIcon,
  fail: xIcon,
  danger: zapIcon,
  error: zapIcon,
  bug: bugIcon,
  example: listIcon,
  quote: quoteIcon,
  cite: quoteIcon,
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
      const iconFactory =
        typeof calloutType === "string"
          ? (icons[calloutType] ?? infoIcon)
          : infoIcon;
      const iconNode = iconFactory();
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
