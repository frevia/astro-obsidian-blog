import { markdownToHtml } from "satteri";
import type {
  Features,
  HastPluginDefinition,
  MdastPluginDefinition,
} from "satteri";

import { calloutHastPlugin, calloutMdastPlugin } from "./plugins/callouts";
import { contentComponentsPlugin } from "./plugins/contentComponents";
import { linkProcessorPlugin, rssLinkProcessorPlugin } from "./plugins/links";
import { createMediaCardPlugin } from "./plugins/mediaCards";
import {
  codeToolbarPlugin,
  figurePlugin,
  headingAnchorPlugin,
  highlightPlugin,
  mathPlugin,
} from "./plugins/presentation";

export interface MarkdownRenderOptions {
  fileURL?: URL;
}

export const markdownFeatures = {
  gfm: true,
  frontmatter: true,
  math: true,
  wikilinks: true,
  directive: true,
} satisfies Features;

export const pageMdastPlugins: MdastPluginDefinition[] = [
  contentComponentsPlugin,
  calloutMdastPlugin,
  linkProcessorPlugin,
  createMediaCardPlugin({ output: "card" }),
];

export const pageHastPlugins: HastPluginDefinition[] = [
  calloutHastPlugin,
  headingAnchorPlugin,
  highlightPlugin,
  mathPlugin,
  codeToolbarPlugin,
  figurePlugin,
];

export const rssMdastPlugins: MdastPluginDefinition[] = [
  contentComponentsPlugin,
  calloutMdastPlugin,
  rssLinkProcessorPlugin,
  createMediaCardPlugin({ output: "link" }),
];

export const rssHastPlugins: HastPluginDefinition[] = [
  calloutHastPlugin,
  highlightPlugin,
  mathPlugin,
  figurePlugin,
];

export async function renderRssMarkdown(
  source: string,
  options: MarkdownRenderOptions = {}
): Promise<string> {
  const result = await markdownToHtml(source, {
    features: markdownFeatures,
    fileURL: options.fileURL,
    mdastPlugins: rssMdastPlugins,
    hastPlugins: rssHastPlugins,
  });

  return result.html;
}
