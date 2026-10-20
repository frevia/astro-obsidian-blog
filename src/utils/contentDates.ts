import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezonePlugin from "dayjs/plugin/timezone";
import { SITE_TIMEZONE, toYMDInTimeZone } from "./calendarDate";

dayjs.extend(utc);
dayjs.extend(timezonePlugin);

export interface EventPeriod {
  start: string;
  end?: string;
}
export interface RecordPeriod extends EventPeriod {
  kind: "event" | "published";
}
export interface DatedRecord {
  eventDate?: string;
  eventEndDate?: string;
  published: Date;
  timezone?: string;
}

function validCalendarDate(value: string) {
  if (!/^\d{4}(?:-\d{2}(?:-\d{2})?)?$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1 || year > 9999) return false;
  if (month === undefined) return true;
  if (month < 1 || month > 12) return false;
  if (day === undefined) return true;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day >= 1 && day <= days[month - 1];
}

export function normalizeEventFields(data: {
  eventDate?: unknown;
  eventEndDate?: unknown;
}): { eventDate?: string; eventEndDate?: string } {
  function normalize(value: unknown, field: string): string | undefined {
    if (value === undefined || value === null || value === "") return undefined;
    if (typeof value !== "string")
      throw new Error(`${field} 必须是加引号的日期文本`);
    const text = value.trim();
    if (!text) return undefined;
    if (!validCalendarDate(text))
      throw new Error(`${field} 必须是有效的 YYYY、YYYY-MM 或 YYYY-MM-DD`);
    return text;
  }
  const eventDate = normalize(data.eventDate, "eventDate");
  const eventEndDate = normalize(data.eventEndDate, "eventEndDate");
  if (eventEndDate) {
    if (!eventDate) throw new Error("eventEndDate 需要 eventDate");
    if (eventEndDate.length !== eventDate.length)
      throw new Error("eventEndDate 与 eventDate 必须使用相同精度");
    if (eventEndDate < eventDate)
      throw new Error("eventEndDate 不能早于 eventDate");
  }
  return { eventDate, eventEndDate };
}

export function getEventPeriod(data: {
  eventDate?: string;
  eventEndDate?: string;
}): EventPeriod | undefined {
  const { eventDate, eventEndDate } = normalizeEventFields(data);
  if (!eventDate) return undefined;
  return {
    start: eventDate,
    ...(eventEndDate && eventEndDate !== eventDate
      ? { end: eventEndDate }
      : {}),
  };
}

export function publicationDay(date: Date, timezone = SITE_TIMEZONE): string {
  return toYMDInTimeZone(date, timezone || SITE_TIMEZONE);
}

export function getRecordPeriod(data: DatedRecord): RecordPeriod {
  const event = getEventPeriod(data);
  return event
    ? { kind: "event", ...event }
    : {
        kind: "published",
        start: publicationDay(data.published, data.timezone),
      };
}

export function formatEventPeriod(period: EventPeriod): string {
  function format(value: string) {
    const [year, month, day] = value.split("-");
    return `${year}年${month ? `${Number(month)}月` : ""}${day ? `${Number(day)}日` : ""}`;
  }
  return period.end && period.end !== period.start
    ? `${format(period.start)}—${format(period.end)}`
    : format(period.start);
}

export function periodKey(period: EventPeriod): string {
  return `${period.start}${period.end && period.end !== period.start ? `..${period.end}` : ""}`;
}

export function compareEventPeriods(a: EventPeriod, b: EventPeriod): number {
  // Zeroes order unknown parts without exposing an invented calendar day.
  const key = (value: string) => {
    const [year, month = "00", day = "00"] = value.split("-");
    return `${year}-${month}-${day}`;
  };
  return (
    key(a.start).localeCompare(key(b.start)) ||
    key(a.end ?? a.start).localeCompare(key(b.end ?? b.start))
  );
}

/** Published is an instant; legacy zone-less values use the site's timezone. */
export function parsePublishedDate(
  value: unknown,
  timezone = SITE_TIMEZONE
): Date {
  const invalid = () => new Date(Number.NaN);
  if (value instanceof Date) return new Date(value.getTime());
  if (typeof value !== "string") return invalid();
  const raw = value.trim();
  const monthOnly = raw.match(/^(\d{4})-(\d{2})$/);
  const match = raw.match(
    /^(\d{4})[-/](\d{2})[-/](\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(\.\d{1,9})?)?(Z|[+-]\d{2}:\d{2})?)?$/
  );
  if (!match && !monthOnly) return invalid();
  const [
    ,
    year,
    month,
    day = "01",
    hour = "00",
    minute = "00",
    second = "00",
    fraction = "",
    offset,
  ] = match ?? monthOnly!;
  const date = `${year}-${month}-${day}`;
  if (
    !validCalendarDate(date) ||
    Number(hour) > 23 ||
    Number(minute) > 59 ||
    Number(second) > 59
  )
    return invalid();
  if (offset && offset !== "Z") {
    const [hours, minutes] = offset.slice(1).split(":").map(Number);
    if (hours > 23 || minutes > 59) return invalid();
  }
  const text = `${date}T${hour}:${minute}:${second}${fraction}`;
  try {
    if (offset) return new Date(`${text}${offset}`);
    const zoned = dayjs.tz(text, timezone);
    // DST gaps and years outside dayjs's supported parsing must not roll over.
    if (
      zoned.format("YYYY-MM-DDTHH:mm:ss") !==
      `${date}T${hour}:${minute}:${second}`
    )
      return invalid();
    return zoned.toDate();
  } catch {
    return invalid();
  }
}
