import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export function fixAssetCacheOrder(config) {
  const routes = config.routes;
  const filesystem = routes.findIndex(route => route.handle === "filesystem");
  const cache = routes.findIndex(route =>
    route.src === "^/_astro/(.*)$" &&
    route.headers?.["cache-control"]?.includes("immutable")
  );
  if (filesystem < 0 || cache < 0) throw new Error("Vercel asset routes changed; review cache ordering");
  // The adapter emits this rule after filesystem, where existing assets bypass it.
  if (cache > filesystem) routes.splice(filesystem, 0, routes.splice(cache, 1)[0]);
  return config;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const file = ".vercel/output/config.json";
  const config = fixAssetCacheOrder(JSON.parse(await readFile(file, "utf8")));
  await writeFile(file, JSON.stringify(config, null, 2) + "\n");
}
