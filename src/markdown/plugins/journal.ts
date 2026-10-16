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
    const count = photos.filter(
      child => isElement(child) && child.tagName === "figure"
    ).length;
    const isCollapsible = body.some(
      child => isElement(child) && child.tagName === "details"
    );
    return {
      type: "element",
      tagName: "div",
      properties: { className: ["journal-photos"], "data-photo-count": count },
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
