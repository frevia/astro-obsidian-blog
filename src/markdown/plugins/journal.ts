import { defineHastPlugin } from "satteri";
import type { Element, ElementContent, RootContent } from "hast";
import type { HastPluginDefinition, HastVisitorContext } from "satteri";

function hasClass(node: Readonly<Element>, name: string): boolean {
  const value = node.properties.className;
  return Array.isArray(value) && value.map(String).includes(name);
}

function isElement(node: RootContent | ElementContent): node is Element {
  return node.type === "element";
}

function isWhitespace(node: RootContent): boolean {
  return node.type === "text" && /^\s*$/.test(node.value);
}

function cloneNode<T extends RootContent | ElementContent>(node: T): T {
  if (isElement(node)) {
    if (hasClass(node, "photo-exif")) {
      const values = node.children.flatMap(child =>
        isElement(child)
          ? child.children
              .filter(item => item.type === "text")
              .map(item => item.value)
          : []
      );
      const model = values
        .find(value => value.startsWith("型号:"))
        ?.replace(/^型号:\s*/, "");
      return {
        ...node,
        tagName: "details",
        properties: { className: ["journal-exif"] },
        children: [
          {
            type: "element",
            tagName: "summary",
            properties: { ariaLabel: `${model ?? "照片"}，拍摄参数` },
            children: [
              { type: "text", value: model ?? "拍摄信息" },
              {
                type: "element",
                tagName: "span",
                properties: {
                  className: ["journal-exif-toggle"],
                  ariaHidden: "true",
                },
                children: [{ type: "text", value: "+" }],
              },
            ],
          },
          {
            type: "element",
            tagName: "div",
            properties: { className: ["journal-exif-fields"] },
            children: node.children.map(child => cloneNode(child)),
          },
        ],
      } as T;
    }
    return {
      ...node,
      properties: { ...node.properties },
      children: node.children.map(child => cloneNode(child)),
    } as T;
  }
  if ("children" in node && Array.isArray(node.children)) {
    return {
      ...node,
      children: node.children.map(child => cloneNode(child)),
    } as T;
  }
  return { ...node } as T;
}

function calloutType(node: RootContent | ElementContent): string | undefined {
  return isElement(node) &&
    node.tagName === "blockquote" &&
    typeof node.properties["data-callout"] === "string"
    ? String(node.properties["data-callout"])
    : undefined;
}

function headerText(node: Readonly<Element>, ctx: HastVisitorContext): string {
  const header = node.children.find(
    child => isElement(child) && hasClass(child, "callout-title")
  );
  if (header && isElement(header)) return ctx.textContent(header).trim();

  const details = node.children.find(
    child => isElement(child) && child.tagName === "details"
  );
  const summary =
    details && isElement(details)
      ? details.children.find(
          child => isElement(child) && child.tagName === "summary"
        )
      : undefined;
  return summary && isElement(summary) ? ctx.textContent(summary).trim() : "";
}

function contentChildren(node: Readonly<Element>): ElementContent[] {
  const details = node.children.find(
    child => isElement(child) && child.tagName === "details"
  );
  if (details && isElement(details)) {
    const summary = details.children.find(
      child => isElement(child) && child.tagName === "summary"
    );
    const body = details.children.find(
      child => isElement(child) && hasClass(child, "callout-content")
    );
    const title =
      summary && isElement(summary)
        ? summary.children.find(
            child => isElement(child) && hasClass(child, "callout-title-text")
          )
        : undefined;
    return [
      {
        type: "element",
        tagName: "details",
        properties: { ...details.properties },
        children: [
          {
            type: "element",
            tagName: "summary",
            properties: {},
            children: title ? [cloneNode(title as ElementContent)] : [],
          },
          ...(body && isElement(body)
            ? body.children.map(child => cloneNode(child))
            : details.children
                .filter(child => child !== summary && child !== body)
                .map(child => cloneNode(child as ElementContent))),
        ],
      },
    ];
  }
  return node.children
    .filter(child => !(isElement(child) && hasClass(child, "callout-title")))
    .map(child => cloneNode(child as ElementContent));
}

function flattenFigures(children: ElementContent[]): ElementContent[] {
  return children.flatMap(child =>
    isElement(child) && hasClass(child, "rehype-figure-container")
      ? child.children.map(item => cloneNode(item))
      : [cloneNode(child)]
  );
}

function journalCallout(
  node: Readonly<Element>,
  type: "photos" | "moment",
  ctx: HastVisitorContext
): Element {
  const body = contentChildren(node);
  const label = headerText(node, ctx);
  if (type === "photos") {
    const photos = flattenFigures(body);
    const figures = photos.filter(
      child => isElement(child) && child.tagName === "figure"
    );
    const count = figures.length;
    const isCollapsible = body.some(
      child => isElement(child) && child.tagName === "details"
    );
    const metadata = node.properties["data-callout-metadata"];
    const requestedLayout =
      typeof metadata === "string" ? metadata.toLowerCase() : "";
    const supportedPairLayout =
      (requestedLayout === "left" ||
        requestedLayout === "equal" ||
        requestedLayout === "right" ||
        requestedLayout === "portraits") &&
      count === 2;
    const supportedSingleLayout = requestedLayout === "wide" && count === 1;
    const layout =
      !isCollapsible && (supportedPairLayout || supportedSingleLayout)
        ? requestedLayout
        : undefined;
    return {
      type: "element",
      tagName: "div",
      properties: {
        className: ["journal-photos"],
        "data-photo-count": count,
        ...(layout ? { "data-photo-layout": layout } : {}),
      },
      children: [
        ...(label && !isCollapsible
          ? [
              {
                type: "element" as const,
                tagName: "p",
                properties: { className: ["journal-photo-label"] },
                children: [{ type: "text" as const, value: label }],
              },
            ]
          : []),
        ...photos,
      ],
    };
  }

  return {
    type: "element",
    tagName: "aside",
    properties: { className: ["journal-moment"] },
    children: [
      ...(label
        ? [
            {
              type: "element" as const,
              tagName: "div",
              properties: { className: ["journal-moment-label"] },
              children: [{ type: "text" as const, value: label }],
            },
          ]
        : []),
      ...body,
    ],
  };
}

function transformCallouts(
  children: RootContent[],
  ctx: HastVisitorContext
): RootContent[] {
  const transformed: RootContent[] = [];
  for (let index = 0; index < children.length; index += 1) {
    const node = children[index];
    const type = calloutType(node);
    if (!type || !isElement(node)) {
      transformed.push(cloneNode(node));
      continue;
    }

    if (type !== "photos" && type !== "moment") {
      transformed.push(cloneNode(node));
      continue;
    }

    let nextIndex = index + 1;
    while (nextIndex < children.length && isWhitespace(children[nextIndex])) {
      nextIndex += 1;
    }
    const next = children[nextIndex];
    if (
      type === "photos" &&
      next &&
      isElement(next) &&
      calloutType(next) === "moment"
    ) {
      transformed.push({
        type: "element",
        tagName: "div",
        properties: { className: ["journal-spread"] },
        children: [
          journalCallout(node, "photos", ctx),
          journalCallout(next, "moment", ctx),
        ],
      });
      index = nextIndex;
      continue;
    }

    transformed.push(journalCallout(node, type, ctx));
  }
  return transformed;
}

function transformRoot(
  children: RootContent[],
  ctx: HastVisitorContext
): RootContent[] {
  const transformed: RootContent[] = [];
  for (let index = 0; index < children.length; ) {
    const node = children[index];
    if (isElement(node) && node.tagName === "h2") {
      let end = index + 1;
      while (end < children.length) {
        const sibling = children[end];
        if (isElement(sibling) && sibling.tagName === "h2") break;
        end += 1;
      }
      const id =
        typeof node.properties.id === "string" ? node.properties.id : "";
      transformed.push({
        type: "element",
        tagName: "section",
        properties: {
          className: ["journal-chapter"],
          ...(id ? { ariaLabelledby: id } : {}),
        },
        children: transformCallouts(
          children.slice(index, end),
          ctx
        ) as ElementContent[],
      });
      index = end;
      continue;
    }

    let end = index + 1;
    while (end < children.length) {
      const sibling = children[end];
      if (isElement(sibling) && sibling.tagName === "h2") break;
      end += 1;
    }
    transformed.push(...transformCallouts(children.slice(index, end), ctx));
    index = end;
  }

  return transformed;
}

export const journalHastPlugin: HastPluginDefinition = defineHastPlugin({
  name: "journal-layout",
  element: {
    filter: ["h2", "blockquote"],
    visit(node, ctx) {
      if (ctx.data.astro?.frontmatter?.pageLayout !== "journal") return;
      if (ctx.data.journalRootTransformed) return;

      const parent = ctx.parent(node);
      if (parent?.type !== "root" || parent.children.length === 0) return;

      ctx.data.journalRootTransformed = true;
      const rootChildren = parent.children as RootContent[];
      ctx.setProperty(parent, "children", transformRoot(rootChildren, ctx));
    },
  },
});
