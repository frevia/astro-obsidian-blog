export const REQUIRED_SKIN_KEYS = [
  "fill",
  "card",
  "base",
  "accent",
  "muted",
  "inverted",
  "border",
  "stateFocusRing",
  "stateHoverFill",
  "stateActiveFill",
  "spaceReadingBlock",
] as const;

export type SkinKey = (typeof REQUIRED_SKIN_KEYS)[number];

/** Tailwind @theme --color-skin-* 与 CSS 变量对齐 */
export const SKIN_TOKEN_MAP: Record<SkinKey, string> = {
  fill: "var(--background)",
  card: "var(--background)",
  base: "var(--foreground)",
  accent: "var(--accent)",
  muted: "var(--muted)",
  inverted: "var(--background)",
  border: "var(--border)",
  stateFocusRing: "var(--accent)",
  stateHoverFill: "var(--muted)",
  stateActiveFill: "color-mix(in oklab, var(--muted) 75%, var(--foreground) 25%)",
  spaceReadingBlock: "var(--space-reading-block)",
};
