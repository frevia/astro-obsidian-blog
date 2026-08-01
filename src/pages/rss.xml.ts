import { pathToFileURL } from "node:url";

import rss from "@astrojs/rss";
import { getCollection } from "astro:content";

import { SITE } from "@/config";
import { renderRssContent, toAbsoluteRssUrl } from "@/utils/rssContent";
import {
  createRssChannelImage,
  createRssEnclosure,
  getCoverImageUrl,
} from "@/utils/rssFeed";
import { getPath } from "@/utils/getPath";
import getSortedPosts from "@/utils/getSortedPosts";
import { optimizeImage } from "@/utils/optimizeImages";

export async function GET() {
  const posts = await getCollection("blog");
  const sortedPosts = getSortedPosts(posts);
  // Astro's resolved base includes CLI overrides such as `astro build --base`.
  // Using the static user config here would make RSS disagree with the build.
  const base = import.meta.env.BASE_URL;
  const site = toAbsoluteRssUrl("/", SITE.website, base);

  const rssItems = await Promise.all(
    sortedPosts.slice(0, 7).map(async post => {
      const thumbnailUrl = await getCoverImageUrl(
        post.data.cover,
        optimizeImage
      );
      const fileURL = post.filePath ? pathToFileURL(post.filePath) : undefined;

      return {
        link: toAbsoluteRssUrl(
          getPath(post.id, post.filePath, true, base),
          SITE.website,
          base
        ),
        title: post.data.title,
        description: post.data.description,
        pubDate: new Date(post.data.published),
        content: await renderRssContent(
          {
            renderedHtml: post.rendered?.html,
            markdown: post.body ?? "",
          },
          {
            site: SITE.website,
            base,
            fileURL,
            optimizeImage,
          }
        ),
        enclosure: createRssEnclosure(thumbnailUrl, SITE.website, base),
      };
    })
  );

  return rss({
    title: SITE.title,
    description: SITE.desc,
    site,
    items: rssItems,
    customData: createRssChannelImage({
      site: SITE.website,
      base,
      title: SITE.title,
      favicon: "favicon.png",
    }),
  });
}
