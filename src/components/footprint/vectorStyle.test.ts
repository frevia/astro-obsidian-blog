import type { StyleSpecification } from "maplibre-gl";
import { describe, expect, it } from "vitest";
import { prepareFootprintStyle } from "./vectorStyle";

function styleWithLayer(layer: StyleSpecification["layers"][number]) {
  return {
    version: 8 as const,
    sources: {},
    layers: [layer],
  } satisfies StyleSpecification;
}

describe("prepareFootprintStyle", () => {
  it("floors numeric label sizes while preserving larger values", () => {
    const style = styleWithLayer({
      id: "city",
      type: "symbol",
      source: "openmaptiles",
      layout: { "text-field": "city", "text-size": 18 },
    });

    const result = prepareFootprintStyle(style);

    expect(result.layers[0]).toMatchObject({
      layout: {
        "text-size": 18,
        "text-field": [
          "coalesce",
          ["get", "name:zh"],
          ["get", "name"],
          ["get", "name:latin"],
          ["get", "name_en"],
        ],
      },
    });
  });

  it("floors zoom interpolation outputs without nesting the zoom expression", () => {
    const style = styleWithLayer({
      id: "town",
      type: "symbol",
      source: "openmaptiles",
      layout: {
        "text-field": "town",
        "text-size": ["interpolate", ["linear"], ["zoom"], 4, 10, 8, 16],
      },
    });

    const result = prepareFootprintStyle(style);

    expect(result.layers[0]).toMatchObject({
      layout: {
        "text-size": ["interpolate", ["linear"], ["zoom"], 4, 14, 8, 16],
      },
    });
    expect(result.layers[0]).not.toMatchObject({
      layout: { "text-size": ["max", 14] },
    });
  });

  it("uses Chinese names first and skips reference shields", () => {
    const style = {
      version: 8 as const,
      sources: {},
      layers: [
        {
          id: "place",
          type: "symbol" as const,
          source: "openmaptiles",
          layout: { "text-field": "place", "text-size": 10 },
        },
        {
          id: "shield",
          type: "symbol" as const,
          source: "openmaptiles",
          layout: { "text-field": ["to-string", ["get", "ref"]] },
        },
      ],
    } satisfies StyleSpecification;

    const result = prepareFootprintStyle(style);

    expect(result.layers[0]).toMatchObject({
      layout: {
        "text-field": [
          "coalesce",
          ["get", "name:zh"],
          ["get", "name"],
          ["get", "name:latin"],
          ["get", "name_en"],
        ],
      },
    });
    expect(result.layers[0]).toMatchObject({ layout: { "text-size": 14 } });
    expect(result.layers[1]).toEqual(style.layers[1]);
  });

  it("gives dark labels readable foreground and halo colors", () => {
    const style = styleWithLayer({
      id: "place",
      type: "symbol",
      source: "openmaptiles",
      layout: { "text-field": "{name}", "text-size": 12 },
      paint: { "text-color": "#555", "text-opacity": 0.9 },
    });
    expect(prepareFootprintStyle(style, true).layers[0]).toMatchObject({
      paint: {
        "text-color": "#d5e3ec",
        "text-halo-color": "#161b22",
        "text-opacity": 0.9,
      },
    });
    expect(style.layers[0]).toMatchObject({ paint: { "text-color": "#555" } });
  });

  it("leaves non-text layers unchanged and does not mutate the input", () => {
    const style = {
      version: 8 as const,
      sources: {},
      layers: [
        {
          id: "land",
          type: "fill" as const,
          source: "openmaptiles",
          paint: { "fill-color": "#fff" },
        },
        {
          id: "city",
          type: "symbol" as const,
          source: "openmaptiles",
          layout: {
            "text-field": "city",
            "text-size": ["interpolate", ["linear"], ["zoom"], 3, 9, 7, 17],
          },
        },
      ],
    } satisfies StyleSpecification;
    const original = JSON.parse(JSON.stringify(style));

    const result = prepareFootprintStyle(style);

    expect(style).toEqual(original);
    expect(result).not.toBe(style);
    expect(result.layers).not.toBe(style.layers);
    expect(result.layers[0]).toEqual(style.layers[0]);
  });
});
