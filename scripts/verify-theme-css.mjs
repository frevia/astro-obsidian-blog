import { readFileSync } from "node:fs";

const css = readFileSync("src/styles/global.css", "utf8");
const required = [
  "--color-skin-fill",
  "--color-skin-card",
  "--color-skin-base",
  "--color-skin-accent",
  "--color-skin-muted",
  "--color-skin-inverted",
  "--color-skin-border",
  "--font-family-sans",
  "--font-family-serif",
];

const missing = required.filter(token => !css.includes(token));
if (missing.length) {
  console.error("Missing theme tokens in global.css:", missing.join(", "));
  process.exit(1);
}
console.log("OK: theme tokens present in global.css");
