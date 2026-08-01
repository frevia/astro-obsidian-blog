import GithubSlugger from "github-slugger";
import { fromHtml } from "hast-util-from-html";
import katex from "katex";
import { defineHastPlugin } from "satteri";
import type { Element, ElementContent, Parents, Root, RootContent } from "hast";
import type { HastPluginDefinition } from "satteri";

function classList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") return value.split(/\s+/).filter(Boolean);
  return [];
}

function hasClass(node: Readonly<Element>, className: string): boolean {
  return classList(node.properties.className).includes(className);
}

function isWhitespace(node: RootContent | ElementContent): boolean {
  return node.type === "text" && /^\s*$/.test(node.value);
}

function isExcludedText(
  node: Parameters<NonNullable<HastPluginDefinition["text"]>>[0],
  ctx: Parameters<NonNullable<HastPluginDefinition["text"]>>[1]
): boolean {
  let current: Readonly<Parents> | undefined = ctx.parent(node);
  while (current) {
    if (
      current.type === "element" &&
      ["code", "pre", "script", "style", "textarea"].includes(current.tagName)
    ) {
      return true;
    }
    current = ctx.parent(current);
  }
  return false;
}

function splitHighlight(value: string): ElementContent[] | undefined {
  const pattern = /==([^=\n]+)==/g;
  const children: ElementContent[] = [];
  let lastIndex = 0;
  let matched = false;
  let match: RegExpExecArray | null = null;

  while ((match = pattern.exec(value)) !== null) {
    matched = true;
    if (match.index > lastIndex) {
      children.push({
        type: "text",
        value: value.slice(lastIndex, match.index),
      });
    }
    children.push({
      type: "element",
      tagName: "mark",
      properties: {},
      children: [{ type: "text", value: match[1] }],
    });
    lastIndex = match.index + match[0].length;
  }

  if (!matched) return undefined;
  if (lastIndex < value.length) {
    children.push({ type: "text", value: value.slice(lastIndex) });
  }
  return children;
}

function figureFromImage(image: Element): Element {
  const alt =
    typeof image.properties.alt === "string" ? image.properties.alt : "";

  return {
    type: "element",
    tagName: "figure",
    properties: { className: ["rehype-figure"] },
    children: alt
      ? [
          image,
          {
            type: "element",
            tagName: "figcaption",
            properties: {},
            children: [{ type: "text", value: alt }],
          },
        ]
      : [image],
  };
}

function codeLanguage(node: Readonly<Element>): string {
  const code = node.children.find(
    child => child.type === "element" && child.tagName === "code"
  );
  if (!code || code.type !== "element") return "text";

  const declaredLanguage = [
    node.properties.dataLanguage,
    node.properties["data-language"],
    code.properties.dataLanguage,
    code.properties["data-language"],
  ].find(value => typeof value === "string" && value.trim());
  if (typeof declaredLanguage === "string") return declaredLanguage;

  const languageClass = [
    ...classList(node.properties.className),
    ...classList(code.properties.className),
  ].find(value => value.startsWith("language-"));
  return languageClass?.slice("language-".length) || "text";
}

export const headingAnchorPlugin: HastPluginDefinition = defineHastPlugin({
  name: "heading-anchor",
  element: {
    filter: ["h1", "h2", "h3", "h4", "h5", "h6"],
    visit(node, ctx) {
      const slugger =
        (ctx.data.headingSlugger as GithubSlugger | undefined) ??
        new GithubSlugger();
      ctx.data.headingSlugger = slugger;

      const id =
        typeof node.properties.id === "string"
          ? node.properties.id
          : slugger.slug(ctx.textContent(node)) || slugger.slug("section");

      ctx.setProperty(node, "id", id);
      ctx.appendChild(node, {
        type: "element",
        tagName: "a",
        properties: {
          href: `#${id}`,
          className: ["heading-anchor"],
          ariaLabel: `Link to ${id}`,
        },
        children: [],
      });
    },
  },
});

export const highlightPlugin: HastPluginDefinition = defineHastPlugin({
  name: "highlight",
  text(node, ctx) {
    if (!node.value.includes("==")) return;
    if (isExcludedText(node, ctx)) return;

    const children = splitHighlight(node.value);
    if (!children) return;

    ctx.insertBefore(node, children);
    ctx.removeNode(node);
  },
});

export const mathPlugin: HastPluginDefinition = defineHastPlugin({
  name: "katex",
  element: {
    filter: ["code"],
    visit(node, ctx) {
      if (!hasClass(node, "math-inline") && !hasClass(node, "math-display")) {
        return;
      }

      const displayMode = hasClass(node, "math-display");
      const source = ctx.textContent(node);
      try {
        const html = katex.renderToString(source, {
          displayMode,
          trust: false,
          throwOnError: true,
        });
        const fragment = fromHtml(html, { fragment: true }) as Root;
        const replacement = fragment.children[0];
        if (!replacement) return;

        const parent = ctx.parent(node);
        if (
          displayMode &&
          parent?.type === "element" &&
          parent.tagName === "pre"
        ) {
          ctx.replaceNode(parent, replacement);
          return;
        }

        ctx.replaceNode(node, replacement);
      } catch (error) {
        ctx.report({
          node,
          severity: "warning",
          message:
            error instanceof Error
              ? `KaTeX render failed: ${error.message}`
              : "KaTeX render failed",
        });
      }
    },
  },
});

export const codeToolbarPlugin: HastPluginDefinition = defineHastPlugin({
  name: "code-toolbar",
  element: {
    filter: ["pre"],
    visit(node, ctx) {
      const parent = ctx.parent(node);
      if (
        parent?.type === "element" &&
        parent.properties.dataCodeToolbar === "true"
      ) {
        return;
      }

      if (
        node.properties.tabIndex === undefined &&
        node.properties.tabindex === undefined
      ) {
        ctx.setProperty(node, "tabIndex", 0);
      }
      ctx.replaceNode(node, {
        type: "element",
        tagName: "div",
        properties: {
          className: ["code-toolbar", "relative"],
          dataCodeToolbar: "true",
        },
        children: [
          node,
          {
            type: "element",
            tagName: "div",
            properties: {
              className: [
                "code-toolbar-controls",
                "absolute",
                "end-3",
                "-top-3",
                "flex",
                "items-center",
                "gap-2",
              ],
            },
            children: [
              {
                type: "element",
                tagName: "span",
                properties: {
                  className: [
                    "code-language",
                    "rounded",
                    "border",
                    "border-muted/30",
                    "bg-muted",
                    "px-2",
                    "py-1",
                    "text-xs",
                    "leading-4",
                    "font-medium",
                    "text-foreground",
                  ],
                  dataCodeLanguage: "true",
                },
                children: [{ type: "text", value: codeLanguage(node) }],
              },
              {
                type: "element",
                tagName: "button",
                properties: {
                  className: [
                    "copy-code",
                    "rounded",
                    "border",
                    "border-muted/30",
                    "bg-muted",
                    "px-2",
                    "py-1",
                    "text-xs",
                    "leading-4",
                    "font-medium",
                    "text-foreground",
                    "transition-colors",
                    "duration-200",
                    "hover:border-muted/60",
                    "hover:bg-surface-muted",
                  ],
                  dataCopyButton: "true",
                  hidden: true,
                  type: "button",
                },
                children: [],
              },
            ],
          },
        ],
      });
    },
  },
});

export const figurePlugin: HastPluginDefinition = defineHastPlugin({
  name: "figure",
  element: {
    filter: ["p"],
    visit(node, ctx) {
      const contentChildren = node.children.filter(
        child => !isWhitespace(child)
      );
      if (!contentChildren.length) return;
      if (
        contentChildren.some(
          child => child.type !== "element" || child.tagName !== "img"
        )
      ) {
        return;
      }

      const figures = contentChildren.map(child =>
        figureFromImage(child as Element)
      );

      if (figures.length === 1) {
        ctx.replaceNode(node, figures[0]);
        return;
      }

      ctx.replaceNode(node, {
        type: "element",
        tagName: "div",
        properties: { className: ["rehype-figure-container"] },
        children: figures,
      });
    },
  },
});
