/** 足迹 SVG 地图 Tailwind 类（FootprintMap 唯一引用） */
export const FOOTPRINT_MAP_THEME = {
  regionFill: "fill-muted/8",
  regionStroke: "stroke-foreground/28",
  regionHoverFill: "hover:fill-accent/8",
  regionTransition: "transition-colors",

  cityDefaultFill: "fill-muted/6",
  cityDefaultStroke: "stroke-foreground/16",

  cityProvinceDefaultFill: "fill-muted/8",
  cityProvinceDefaultStroke: "stroke-foreground/32",
  cityProvinceHoverFill: "hover:fill-accent/10",
  cityProvinceSelectedFill: "fill-accent/12",
  cityProvinceSelectedStroke: "stroke-accent/80",

  visitedNationalFill: "fill-[#ff5a36]/75",
  visitedNationalStroke: "stroke-[#ff3b30]",
  visitedNationalSpotlightFill: "fill-[#ff5a36]/80",
  visitedNationalSpotlightStroke: "stroke-[#ff3b30]",

  visitedProvinceFill: "fill-[#ff5a36]/75",
  visitedProvinceStroke: "stroke-[#9f1a10]",
  visitedProvinceSelectedFill: "fill-[#ff5a36]/82",
  visitedProvinceSelectedStroke: "stroke-accent",

  markerFill: "fill-accent/90",
  markerStroke: "stroke-background",

  labelFill: "fill-foreground/72",
  labelStroke: "stroke-background/75",
  labelFont: "pointer-events-none select-none font-serif font-medium",
} as const;

export const FOOTPRINT_THEME_CLASS_VALUES: string[] = Object.values(
  FOOTPRINT_MAP_THEME
);
