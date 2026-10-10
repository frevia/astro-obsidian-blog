import { existsSync, readFileSync } from "node:fs";

const SOURCE = "src/styles/footprint-leaflet.css";
const REQUIRED = [
  "html[data-theme=\"dark\"] .footprint-leaflet-map",
  ".footprint-leaflet-map .leaflet-gl-layer",
  ".footprint-marker-icon.is-selected",
];
const FORBIDDEN = ["footprint-map-tile-filter", ".leaflet-tile-pane", "invert("];

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
    console.error("raster-only footprint theme token found", token);
    process.exit(1);
  }
}

process.exit(0);
