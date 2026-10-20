import { getEventPeriod, normalizeEventFields } from "./contentDates";

export interface JournalTimelineHeading {
  date: string;
  period: string;
  title: string;
}

export function parseJournalTimelineHeading(
  text: string
): JournalTimelineHeading | undefined {
  const match = text.match(
    /^(\d{4}-\d{2}-\d{2})(?:\s+(.+?))?\s*[｜|]\s*(\S(?:.*\S)?)$/
  );
  if (!match) return undefined;

  try {
    const { eventDate } = normalizeEventFields({ eventDate: match[1] });
    const period = getEventPeriod({ eventDate });
    if (!period) return undefined;
    return {
      date: period.start,
      period: match[2]?.trim() ?? "",
      title: match[3].trim(),
    };
  } catch {
    return undefined;
  }
}
