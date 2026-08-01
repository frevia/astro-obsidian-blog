import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const assetsDir = "dist/client/_astro";

function walk(dir) {
  return readdirSync(dir).flatMap(entry => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const css = walk(assetsDir)
  .filter(path => path.endsWith(".css"))
  .map(path => readFileSync(path, "utf8"))
  .join("\n");

function mediaBlocks(source, queryPattern) {
  const blocks = [];
  for (const match of source.matchAll(queryPattern)) {
    const openBrace = source.indexOf("{", match.index);
    if (openBrace === -1) continue;

    let depth = 1;
    let cursor = openBrace + 1;
    while (cursor < source.length && depth > 0) {
      if (source[cursor] === "{") depth += 1;
      if (source[cursor] === "}") depth -= 1;
      cursor += 1;
    }
    if (depth === 0) blocks.push(source.slice(openBrace + 1, cursor - 1));
  }
  return blocks;
}

const smMediaCss = mediaBlocks(
  css,
  /@media\s*\(\s*width\s*>=\s*40rem\s*\)/g
).join("\n");

const assertions = [
  {
    matches: /[\s\S]+/,
    source: smMediaCss,
    message: "missing Tailwind sm breakpoint media query",
  },
  {
    matches: /\.sm\\:flex(?:\b|[,{])/,
    source: smMediaCss,
    message: "missing generated sm:flex utility inside the sm media query",
  },
  {
    matches: /\.sm\\:hidden(?:\b|[,{])/,
    source: smMediaCss,
    message: "missing generated sm:hidden utility inside the sm media query",
  },
];

const failures = assertions
  .filter(({ matches, source }) => !matches.test(source))
  .map(({ message }) => message);

if (failures.length > 0) {
  throw new Error(`Responsive production CSS verification failed: ${failures.join(", ")}`);
}

console.log("OK: responsive Tailwind utilities are present in production CSS");
