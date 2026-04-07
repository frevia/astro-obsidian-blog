import { SITE } from "@/config";

/** 站点日历、事件聚合使用的时区（与博客/Diary 展示一致） */
export const SITE_TIMEZONE = SITE.timezone;
export const CALENDAR_TZ = SITE_TIMEZONE;

export function formatInTimeZone(
  d: Date,
  locale: string,
  options: Intl.DateTimeFormatOptions,
  timeZone: string = SITE_TIMEZONE
): string {
  return new Intl.DateTimeFormat(locale, {
    ...options,
    timeZone,
  }).format(d);
}

export function formatSiteDate(
  d: Date,
  locale: string,
  options: Intl.DateTimeFormatOptions
): string {
  return formatInTimeZone(d, locale, options, SITE_TIMEZONE);
}

export function getTimeZoneDateParts(
  d: Date,
  timeZone: string = SITE_TIMEZONE
): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(d);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find(part => part.type === type)?.value ?? 0);

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

export function getSiteDateParts(d: Date) {
  return getTimeZoneDateParts(d, SITE_TIMEZONE);
}

/**
 * 将某一时刻格式化为该时区下的公历 YYYY-MM-DD（与 Vercel UTC 进程、用户本机时区无关）
 */
export function toYMDInTimeZone(
  d: Date,
  timeZone: string = SITE_TIMEZONE
): string {
  return formatInTimeZone(
    d,
    "en-CA",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
    timeZone
  );
}

export function toSiteYMD(d: Date): string {
  return toYMDInTimeZone(d, SITE_TIMEZONE);
}

export function getYearMonthInTimeZone(
  d: Date,
  timeZone: string = SITE_TIMEZONE
): { year: number; monthIndex: number } {
  const ymd = toYMDInTimeZone(d, timeZone);
  const [y, m] = ymd.split("-").map(Number);
  return { year: y, monthIndex: m - 1 };
}

export function getSiteYearMonth(d: Date): {
  year: number;
  monthIndex: number;
} {
  return getYearMonthInTimeZone(d, SITE_TIMEZONE);
}

export function getYearInTimeZone(
  d: Date,
  timeZone: string = SITE_TIMEZONE
): number {
  return getYearMonthInTimeZone(d, timeZone).year;
}

export function getSiteYear(d: Date): number {
  return getYearInTimeZone(d, SITE_TIMEZONE);
}

export function parseYMDAsUTC(ymd: string): Date {
  const [year, month, day] = ymd.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function getYMDParts(ymd: string): {
  year: number;
  month: number;
  day: number;
} {
  const [year, month, day] = ymd.split("-").map(Number);
  return { year, month, day };
}
