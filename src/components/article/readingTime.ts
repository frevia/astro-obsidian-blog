const CODE_FENCE = /```[\s\S]*?```/g;
const CJK_CHARACTERS = /[\u3400-\u9fff]/g;
const LATIN_WORDS = /[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g;

/**
 * Estimates an article's reading duration without shipping a client runtime.
 * CJK characters and Latin words are counted as readable units; fenced code is
 * excluded so technical snippets do not inflate the visible estimate.
 */
export function estimateReadingMinutes(
  content: string,
  unitsPerMinute = 420
): number {
  const safeContent = content.replace(CODE_FENCE, " ");
  const cjkUnits = safeContent.match(CJK_CHARACTERS)?.length ?? 0;
  const latinUnits = safeContent.match(LATIN_WORDS)?.length ?? 0;
  const safeRate = Number.isFinite(unitsPerMinute)
    ? Math.max(1, unitsPerMinute)
    : 420;

  return Math.max(1, Math.ceil((cjkUnits + latinUnits) / safeRate));
}
