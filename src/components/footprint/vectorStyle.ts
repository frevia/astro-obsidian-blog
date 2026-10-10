import type { StyleSpecification } from "maplibre-gl";

const MIN_LABEL_SIZE = 14;

type StyleLayer = StyleSpecification["layers"][number];
type SymbolLayer = Extract<StyleLayer, { type: "symbol" }>;
type SymbolLayout = NonNullable<SymbolLayer["layout"]>;

function chineseNameField(): SymbolLayout["text-field"] {
  return [
    "coalesce",
    ["get", "name:zh"],
    ["get", "name"],
    ["get", "name:latin"],
    ["get", "name_en"],
  ];
}

function isGetRef(value: unknown): boolean {
  return Array.isArray(value) && value[0] === "get" && value[1] === "ref";
}

function isReferenceTextField(value: unknown): boolean {
  return (
    isGetRef(value) ||
    (Array.isArray(value) && value[0] === "to-string" && isGetRef(value[1]))
  );
}

function floorTextSize(
  value: SymbolLayout["text-size"]
): SymbolLayout["text-size"] {
  if (typeof value === "number") return Math.max(MIN_LABEL_SIZE, value);
  if (!Array.isArray(value)) return value;
  if (
    value[0] !== "interpolate" ||
    !Array.isArray(value[2]) ||
    value[2][0] !== "zoom"
  ) {
    return value;
  }

  const next = [...value];
  for (let index = 4; index < next.length; index += 2) {
    const output = next[index];
    if (typeof output === "number") {
      next[index] = Math.max(MIN_LABEL_SIZE, output);
    }
  }
  return next as SymbolLayout["text-size"];
}

/** Add Chinese label fallbacks without changing the provider's style object. */
export function prepareFootprintStyle(
  style: StyleSpecification,
  dark = false
): StyleSpecification {
  return {
    ...style,
    layers: style.layers.map(layer => {
      if (layer.type !== "symbol") return { ...layer };

      const textField = layer.layout?.["text-field"];
      if (textField === undefined || isReferenceTextField(textField)) {
        return { ...layer };
      }

      const layout = {
        ...layer.layout,
        "text-field": chineseNameField(),
      } as SymbolLayout;
      if (layout["text-size"] !== undefined) {
        layout["text-size"] = floorTextSize(layout["text-size"]);
      }

      return {
        ...layer,
        layout,
        ...(dark
          ? {
              paint: {
                ...layer.paint,
                "text-color": "#d5e3ec",
                "text-halo-color": "#161b22",
                "text-halo-width": 1.5,
              },
            }
          : {}),
      };
    }),
  };
}
