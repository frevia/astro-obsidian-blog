import type { WikilinkReference } from "./wikilinkGraph";
import { withBase } from "./withBase";

export interface PreparedWikilinkReference {
  reference: WikilinkReference;
  href: string;
}

/** Accept only site-relative wikilink routes before applying Astro's base. */
export function safeWikilinkHref(href: string): string | undefined {
  const path = href.trim();
  const hasControlCharacter = [...path].some(character => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });

  if (
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.includes("\\") ||
    hasControlCharacter
  ) {
    return undefined;
  }

  return withBase(path);
}

export function prepareWikilinkReferences(
  references: readonly WikilinkReference[]
): PreparedWikilinkReference[] {
  return references.flatMap(reference => {
    const href = safeWikilinkHref(reference.href);
    return href ? [{ reference, href }] : [];
  });
}
