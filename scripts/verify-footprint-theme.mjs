import { existsSync, readFileSync } from "node:fs";

const SOURCE = "src/styles/footprint-map-theme.ts";
const ORANGE = /#ff5a36/;

if (!existsSync(SOURCE)) {
  console.error("missing", SOURCE);
  process.exit(1);
}

const text = readFileSync(SOURCE, "utf8");
if (!ORANGE.test(text)) {
  console.error("visited highlight orange not found in", SOURCE);
  process.exit(1);
}

process.exit(0);
