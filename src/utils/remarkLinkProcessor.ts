import { visit } from "unist-util-visit";
import type { Plugin } from "unified";
import type { Root, Link, Text, RootContent, PhrasingContent } from "mdast";
import { processLink } from "./linkProcessor";

interface RemarkLinkProcessorOptions {
  enableDebug?: boolean;
}

/**
 * Remark插件：处理markdown中的相对链接
 * 将指向blog文件夹下md/mdx文件的相对链接转换为/posts/[slug]格式
 */
export const remarkLinkProcessor: Plugin<
  [RemarkLinkProcessorOptions?],
  Root
> = (options = {}) => {
  const { enableDebug = false } = options;

  return (tree, file) => {
    // 获取当前文件路径，用于解析相对路径
    const currentFilePath = file.path || file.history?.[0];

    if (enableDebug) {
      console.log("Processing file:", currentFilePath);
    }

    visit(tree, "link", (node: Link) => {
      const originalUrl = node.url;

      // 跳过绝对URL、锚点链接等
      if (
        originalUrl.startsWith("http://") ||
        originalUrl.startsWith("https://") ||
        originalUrl.startsWith("#") ||
        originalUrl.startsWith("mailto:") ||
        originalUrl.startsWith("tel:")
      ) {
        return;
      }

      // 处理链接
      const processedUrl = processLink(originalUrl, currentFilePath);

      if (processedUrl !== originalUrl) {
        if (enableDebug) {
          console.log(`Link processed: ${originalUrl} -> ${processedUrl}`);
        }
        node.url = processedUrl;

        // 如果是内部博客链接，添加 target="_blank" 属性在新标签页打开
        if (processedUrl.startsWith("/posts/")) {
          // 为链接节点添加 data 属性，用于在渲染时设置 target="_blank"
          if (!node.data) {
            node.data = {};
          }
          if (!node.data.hProperties) {
            node.data.hProperties = {};
          }
          (node.data.hProperties as Record<string, string>).target = "_blank";
          (node.data.hProperties as Record<string, string>).rel =
            "noopener noreferrer";
        }
      }
    });

    const imageExt = /\.(png|jpe?g|gif|webp|svg|avif)$/i;

    const splitOnce = (input: string, divider: string) => {
      const index = input.indexOf(divider);
      if (index === -1) return [input, ""];
      return [input.slice(0, index), input.slice(index + divider.length)];
    };

    const getDefaultLabel = (target: string) => {
      const normalized = target.trim().replace(/\\/g, "/");
      const lastPart =
        normalized.split("/").filter(Boolean).pop() || normalized;
      return lastPart.replace(/\.[^.]+$/, "");
    };

    const parseWikiTarget = (target: string) => {
      const [pathPart, headingPart] = splitOnce(target, "#");
      return { pathPart: pathPart.trim(), headingPart: headingPart.trim() };
    };

    const transformWikiText = (
      text: string
    ): Array<RootContent | PhrasingContent> => {
      const pattern = /(!?)\[\[([^[\]]+?)\]\]/g;
      const nodes: Array<RootContent | PhrasingContent> = [];
      let lastIndex = 0;
      let hasMatched = false;
      let match: RegExpExecArray | null = null;

      while ((match = pattern.exec(text)) !== null) {
        hasMatched = true;
        const [fullMatch, embedMark, innerRaw] = match;
        const matchStart = match.index;
        const matchEnd = matchStart + fullMatch.length;

        if (matchStart > lastIndex) {
          nodes.push({
            type: "text",
            value: text.slice(lastIndex, matchStart),
          });
        }

        const isEmbed = embedMark === "!";
        const [targetRaw, aliasRaw] = splitOnce(innerRaw, "|");
        const { pathPart, headingPart } = parseWikiTarget(targetRaw);
        const label = (aliasRaw || getDefaultLabel(pathPart)).trim();

        if (!pathPart) {
          nodes.push({ type: "text", value: fullMatch });
          lastIndex = matchEnd;
          continue;
        }

        if (isEmbed && imageExt.test(pathPart)) {
          nodes.push({
            type: "image",
            url: pathPart,
            alt: label || getDefaultLabel(pathPart),
            title: null,
          });
          lastIndex = matchEnd;
          continue;
        }

        const normalizedTarget =
          pathPart.includes(".") || pathPart.startsWith("/")
            ? pathPart
            : `${pathPart}.md`;
        const finalUrl = processLink(
          headingPart ? `${normalizedTarget}#${headingPart}` : normalizedTarget,
          currentFilePath
        );
        const linkNode: Link = {
          type: "link",
          url: finalUrl,
          title: null,
          children: [
            { type: "text", value: label || getDefaultLabel(pathPart) },
          ],
        };

        if (finalUrl.startsWith("/posts/")) {
          linkNode.data = {
            hProperties: {
              target: "_blank",
              rel: "noopener noreferrer",
            },
          };
        }

        nodes.push(linkNode);
        lastIndex = matchEnd;
      }

      if (!hasMatched) {
        return [{ type: "text", value: text }];
      }

      if (lastIndex < text.length) {
        nodes.push({ type: "text", value: text.slice(lastIndex) });
      }

      return nodes;
    };

    const replacements: Array<{
      parent: { children: Array<RootContent | PhrasingContent> };
      index: number;
      nodes: Array<RootContent | PhrasingContent>;
    }> = [];

    visit(tree, "text", (node: Text, index, parent) => {
      if (index === undefined || !parent || !("children" in parent)) return;
      if (!node.value.includes("[[")) return;
      const nodes = transformWikiText(node.value);
      if (nodes.length === 1 && nodes[0].type === "text") return;
      replacements.push({
        parent: parent as unknown as {
          children: Array<RootContent | PhrasingContent>;
        },
        index,
        nodes,
      });
    });

    for (let i = replacements.length - 1; i >= 0; i--) {
      const { parent, index, nodes } = replacements[i];
      parent.children.splice(index, 1, ...nodes);
    }
  };
};

export default remarkLinkProcessor;
