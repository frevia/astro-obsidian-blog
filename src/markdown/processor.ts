import { markdownToHtml } from "satteri";
import type {
  Features,
  HastPluginDefinition,
  MdastPluginDefinition,
} from "satteri";

import { calloutHastPlugin, calloutMdastPlugin } from "./plugins/callouts";
import { linkProcessorPlugin, rssLinkProcessorPlugin } from "./plugins/links";
import { mediaCardPlugin } from "./plugins/mediaCards";
import {
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
} satisfies Features;

export const pageMdastPlugins: MdastPluginDefinition[] = [
  calloutMdastPlugin,
  linkProcessorPlugin,
  mediaCardPlugin,
];

export const pageHastPlugins: HastPluginDefinition[] = [
  calloutHastPlugin,
  headingAnchorPlugin,
  highlightPlugin,
  mathPlugin,
  figurePlugin,
];

export const rssMdastPlugins: MdastPluginDefinition[] = [
  calloutMdastPlugin,
  rssLinkProcessorPlugin,
  mediaCardPlugin,
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
