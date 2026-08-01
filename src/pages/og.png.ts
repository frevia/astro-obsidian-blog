import type { APIRoute } from "astro";
import { generateOgImageForSite } from "@/utils/generateOgImages";
import { SITE } from "@/config";

export const GET: APIRoute = async ({ url }) => {
  if (SITE.cover) {
    return new Response(null, {
      status: 404,
      statusText: "Not found",
    });
  }

  const pngBuffer = await generateOgImageForSite(url);
  const body = new Uint8Array(pngBuffer);

  return new Response(body, {
    headers: { "Content-Type": "image/png" },
  });
};
