import { slugifyStr } from "./slugify";

const encodeNonAscii = (char: string) =>
  `u${char.codePointAt(0)?.toString(16).padStart(6, "0") ?? "000000"}`;

/**
 * Produces a deterministic CSS <custom-ident> for view-transition-name.
 */
export const toTransitionName = (value: string): string => {
  const slug = slugifyStr(value.replaceAll(".", "-"));
  const transitionName = slug
    .replace(/[^\x00-\x7F]/gu, encodeNonAscii)
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!transitionName) return "post";
  if (/^\d/.test(transitionName)) return `p-${transitionName}`;
  return transitionName;
};
