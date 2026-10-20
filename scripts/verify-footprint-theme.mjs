import { existsSync, readFileSync } from "node:fs";

const SOURCE = "src/styles/footprint-map.css";
const REQUIRED = [
  'html[data-theme="dark"] .footprint-amap',
  ".footprint-photo-panel",
  ".footprint-marker-icon.is-selected",
];
const FORBIDDEN = ["invert("];

if (!existsSync(SOURCE)) {
  console.error("missing", SOURCE);
  process.exit(1);
}

const text = readFileSync(SOURCE, "utf8");
for (const token of REQUIRED) {
  if (!text.includes(token)) {
    console.error("required footprint theme token not found", token);
    process.exit(1);
  }
}

for (const token of FORBIDDEN) {
  if (text.includes(token)) {
    console.error(
      "map color inversion is incompatible with native AMap themes",
      token
    );
    process.exit(1);
  }
}

process.exit(0);
