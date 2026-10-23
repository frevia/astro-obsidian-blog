import { readFile } from "node:fs/promises";
import type { APIRoute, GetStaticPaths } from "astro";

import { enumeratePublicVideos } from "@/utils/publicVideo";

export const prerender = true;

export const getStaticPaths: GetStaticPaths = async () =>
  (await enumeratePublicVideos())
    .filter(({ pathname }) => pathname.startsWith("/attachments/"))
    .map(({ filepath, pathname }) => ({
      params: { path: pathname.slice("/attachments/".length) },
      props: { filepath },
    }));

export const GET: APIRoute = async ({ props }) =>
  new Response(new Uint8Array(await readFile(props.filepath)), {
    headers: { "Content-Type": "video/mp4" },
  });
