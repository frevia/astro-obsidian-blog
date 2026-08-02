import { defineMdastPlugin } from "satteri";
import type { MdastPluginDefinition } from "satteri";
import type {
  BlockContent,
  Blockquote,
  Code,
  List,
  ListItem,
  Paragraph,
  PhrasingContent,
  RootContent,
} from "mdast";

type ContainerDirective = Extract<RootContent, { type: "containerDirective" }>;

type ContentComponentKind =
  | "pullquote"
  | "gallery"
  | "timeline"
  | "aside"
  | "stats"
  | "map";

type DirectiveAttributes = NonNullable<ContainerDirective["attributes"]>;

const componentKinds = new Set<ContentComponentKind>([
  "pullquote",
  "gallery",
  "timeline",
  "aside",
  "stats",
  "map",
]);

function isComponentKind(value: string): value is ContentComponentKind {
  return componentKinds.has(value as ContentComponentKind);
}

function attribute(
  attributes: DirectiveAttributes | null | undefined,
  name: string
): string | undefined {
  const value = attributes?.[name] ?? attributes?.[`data-${name}`];
  return typeof value === "string" ? value : undefined;
}

function safeText(
  value: string | undefined,
  maxLength = 200
): string | undefined {
  if (!value) return undefined;
  const normalized = value.replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  return normalized ? normalized.slice(0, maxLength) : undefined;
}

function safeToken(value: string | undefined): string | undefined {
  const normalized = value?.trim().toLowerCase();
  return normalized && /^[a-z0-9][a-z0-9_-]{0,31}$/.test(normalized)
    ? normalized
    : undefined;
}

function safeNumber(
  value: string | undefined,
  minimum: number,
  maximum: number
): string | undefined {
  if (!value || !/^-?\d+(?:\.\d+)?$/.test(value.trim())) return undefined;
  const number = Number(value);
  return Number.isFinite(number) && number >= minimum && number <= maximum
    ? String(number)
    : undefined;
}

function componentProperties(
  kind: ContentComponentKind,
  attributes: DirectiveAttributes | null | undefined
): Record<string, unknown> {
  const properties: Record<string, unknown> = {
    className: ["content-block", `content-block--${kind}`],
    "data-content-component": kind,
  };
  const title = safeText(attribute(attributes, "title"));
  const layout = safeToken(attribute(attributes, "layout"));
  const variant = safeToken(attribute(attributes, "variant"));

  if (title) properties["data-title"] = title;
  if (layout) properties["data-layout"] = layout;
  if (variant) properties["data-variant"] = variant;

  if (kind === "gallery" || kind === "stats") {
    const columns = safeNumber(attribute(attributes, "columns"), 1, 12);
    if (columns) properties["data-columns"] = columns;
  }

  if (kind === "map") {
    const label = safeText(attribute(attributes, "label") ?? title);
    const latitude = safeNumber(attribute(attributes, "latitude"), -90, 90);
    const longitude = safeNumber(attribute(attributes, "longitude"), -180, 180);
    const zoom = safeNumber(attribute(attributes, "zoom"), 0, 24);

    properties.role = "group";
    if (label) properties.ariaLabel = label;
    if (latitude !== undefined) properties["data-latitude"] = latitude;
    if (longitude !== undefined) properties["data-longitude"] = longitude;
    if (zoom !== undefined) properties["data-zoom"] = zoom;
  }

  return properties;
}

function setComponentRoot(
  node: Readonly<ContainerDirective>,
  ctx: Parameters<NonNullable<MdastPluginDefinition["containerDirective"]>>[1],
  kind: ContentComponentKind,
  hName: string
): void {
  ctx.setProperty(node, "data", {
    ...node.data,
    hName,
    hProperties: componentProperties(kind, node.attributes),
  });
}

function paragraphWithTag(
  tagName: string,
  children: PhrasingContent[],
  className?: string
): Paragraph {
  return {
    type: "paragraph",
    data: {
      hName: tagName,
      hProperties: className ? { className: [className] } : {},
    },
    children,
  };
}

function pullquoteChildren(node: Readonly<ContainerDirective>): BlockContent[] {
  const quote: Blockquote = {
    type: "blockquote",
    data: {
      hProperties: { className: ["content-block__quote"] },
    },
    children: [...node.children] as BlockContent[],
  };
  const attribution = safeText(
    attribute(node.attributes, "attribution") ??
      attribute(node.attributes, "cite") ??
      attribute(node.attributes, "source")
  );

  return attribution
    ? [
        quote,
        paragraphWithTag(
          "figcaption",
          [{ type: "text", value: attribution }],
          "content-block__caption"
        ),
      ]
    : [quote];
}

function timelineItem(item: Readonly<ListItem>): ListItem {
  return {
    ...item,
    data: {
      ...item.data,
      hProperties: { className: ["content-block__item"] },
    },
    children: [...item.children],
  };
}

function timelineChildren(node: Readonly<ContainerDirective>): ListItem[] {
  const onlyChild = node.children.length === 1 ? node.children[0] : undefined;
  if (onlyChild?.type === "list") {
    return (onlyChild as List).children.map(timelineItem);
  }

  return node.children.map(child => ({
    type: "listItem",
    data: { hProperties: { className: ["content-block__item"] } },
    children: [child as BlockContent],
  }));
}

function trimPhrasing(children: PhrasingContent[]): PhrasingContent[] {
  const result = children.map(child => ({ ...child })) as PhrasingContent[];
  while (result[0]?.type === "text") {
    result[0].value = result[0].value.replace(/^\s+/, "");
    if (result[0].value) break;
    result.shift();
  }
  while (result.at(-1)?.type === "text") {
    const last = result.at(-1);
    if (!last || last.type !== "text") break;
    last.value = last.value.replace(/\s+$/, "");
    if (last.value) break;
    result.pop();
  }
  return result;
}

function splitStatRow(
  children: ReadonlyArray<PhrasingContent>
): [PhrasingContent[], PhrasingContent[]] | undefined {
  const before: PhrasingContent[] = [];
  const after: PhrasingContent[] = [];
  let foundSeparator = false;

  for (const child of children) {
    if (!foundSeparator && child.type === "text") {
      const separatorIndex = child.value.search(/[:：]/);
      if (separatorIndex >= 0) {
        const leading = child.value.slice(0, separatorIndex);
        const trailing = child.value.slice(separatorIndex + 1);
        if (leading) before.push({ ...child, value: leading });
        if (trailing) after.push({ ...child, value: trailing });
        foundSeparator = true;
        continue;
      }
    }
    (foundSeparator ? after : before).push({ ...child });
  }

  const term = trimPhrasing(before);
  const description = trimPhrasing(after);
  return foundSeparator && term.length && description.length
    ? [term, description]
    : undefined;
}

function statFallback(children: BlockContent[]): BlockContent[] {
  const term: Blockquote = {
    type: "blockquote",
    data: {
      hName: "dt",
      hProperties: { className: ["content-block__term"] },
    },
    children,
  };
  const description = paragraphWithTag("dd", [], "content-block__value");
  return [term, description];
}

function statPair(
  paragraph: Readonly<Paragraph>,
  trailing: BlockContent[]
): BlockContent[] {
  const pair = splitStatRow(paragraph.children);
  if (!pair) {
    return statFallback([
      { ...paragraph, children: [...paragraph.children] },
      ...trailing,
    ]);
  }

  const [term, description] = pair;
  const dt = paragraphWithTag("dt", term, "content-block__term");
  if (!trailing.length) {
    return [dt, paragraphWithTag("dd", description, "content-block__value")];
  }

  const dd: Blockquote = {
    type: "blockquote",
    data: {
      hName: "dd",
      hProperties: { className: ["content-block__value"] },
    },
    children: [{ type: "paragraph", children: description }, ...trailing],
  };
  return [dt, dd];
}

function statsChildren(node: Readonly<ContainerDirective>): BlockContent[] {
  const onlyChild = node.children.length === 1 ? node.children[0] : undefined;
  const rows: BlockContent[][] =
    onlyChild?.type === "list"
      ? (onlyChild as List).children.map(
          item => [...item.children] as BlockContent[]
        )
      : node.children.map(child => [child as BlockContent]);

  return rows.flatMap(row => {
    const first = row[0];
    return first?.type === "paragraph"
      ? statPair(first, row.slice(1))
      : statFallback(row);
  });
}

function preserveUnknownDirective(
  node: Readonly<ContainerDirective>,
  source: string
): Code {
  const start = node.position?.start.offset;
  const end = node.position?.end.offset;
  const value =
    typeof start === "number" && typeof end === "number"
      ? new TextDecoder().decode(
          new TextEncoder().encode(source).slice(start, end)
        )
      : `:::${node.name}\n:::`;
  return { type: "code", lang: "markdown", value };
}

export const contentComponentsPlugin: MdastPluginDefinition = defineMdastPlugin(
  {
    name: "content-components",
    containerDirective(node, ctx) {
      const kind = node.name.toLowerCase();
      if (!isComponentKind(kind)) {
        ctx.replaceNode(node, preserveUnknownDirective(node, ctx.source));
        return;
      }

      switch (kind) {
        case "pullquote":
          setComponentRoot(node, ctx, kind, "figure");
          ctx.setProperty(node, "children", pullquoteChildren(node));
          break;
        case "gallery":
          setComponentRoot(node, ctx, kind, "div");
          break;
        case "timeline":
          setComponentRoot(node, ctx, kind, "ol");
          ctx.setProperty(node, "children", timelineChildren(node));
          break;
        case "aside":
          setComponentRoot(node, ctx, kind, "aside");
          break;
        case "stats":
          setComponentRoot(node, ctx, kind, "dl");
          ctx.setProperty(node, "children", statsChildren(node));
          break;
        case "map":
          setComponentRoot(node, ctx, kind, "section");
          break;
      }
    },
  }
);
