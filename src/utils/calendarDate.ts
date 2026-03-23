import { SITE } from "@/config";

/** 站点日历、事件聚合使用的时区（与博客/Diary 展示一致） */
export const CALENDAR_TZ = SITE.timezone;

/**
 * 将某一时刻格式化为该时区下的公历 YYYY-MM-DD（与 Vercel UTC 进程、用户本机时区无关）
 */
export function toYMDInTimeZone(
  d: Date,
  timeZone: string = CALENDAR_TZ
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function getYearMonthInTimeZone(
  d: Date,
  timeZone: string = CALENDAR_TZ
): { year: number; monthIndex: number } {
  const ymd = toYMDInTimeZone(d, timeZone);
  const [y, m] = ymd.split("-").map(Number);
  return { year: y, monthIndex: m - 1 };
}
