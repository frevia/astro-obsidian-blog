export const REQUIRED_SKIN_KEYS = [
  "fill",
  "card",
  "base",
  "accent",
  "muted",
  "inverted",
  "border",
] as const;

export type SkinKey = (typeof REQUIRED_SKIN_KEYS)[number];

/** Tailwind @theme --color-skin-* 与 CSS 变量对齐 */
export const SKIN_TOKEN_MAP: Record<SkinKey, string> = {
  fill: "var(--background)",
  card: "color-mix(in oklch, var(--background) 92%, var(--accent) 8%)",
  base: "var(--foreground)",
  accent: "var(--accent)",
  muted: "var(--muted)",
  inverted: "var(--background)",
  border: "var(--border)",
};
