import { Resvg } from "@resvg/resvg-js";
import { type CollectionEntry } from "astro:content";
import postOgImage from "./og-templates/post";
import siteOgImage from "./og-templates/site";

interface OgImageSizeOptions {
  width: number;
  height: number;
}

const renderPostOgImage = postOgImage as (
  post: CollectionEntry<"blog">,
  options?: OgImageSizeOptions
) => Promise<string>;

function svgBufferToPngBuffer(svg: string) {
  const resvg = new Resvg(svg);
  const pngData = resvg.render();
  return pngData.asPng();
}

export async function generateOgImageForPost(
  post: CollectionEntry<"blog">,
  size: OgImageSizeOptions = { width: 1200, height: 630 }
) {
  const svg = await renderPostOgImage(post, size);
  return svgBufferToPngBuffer(svg);
}

export async function generateOgImageForSite() {
  const svg = await siteOgImage();
  return svgBufferToPngBuffer(svg);
}
