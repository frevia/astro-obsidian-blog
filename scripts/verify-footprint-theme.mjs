import { existsSync, readFileSync } from "node:fs";

const SOURCE = "src/styles/footprint-leaflet.css";
const REQUIRED = [
  "--footprint-map-tile-filter",
  "html[data-theme=\"dark\"] .footprint-leaflet-map",
  ".footprint-marker-icon.is-selected",
];

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

process.exit(0);
