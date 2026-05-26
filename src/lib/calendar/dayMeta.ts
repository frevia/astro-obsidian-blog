export type DayTagType = "rest" | "makeup" | "inLieu" | null;

const ENGLISH_WEEKDAY_NAMES = new Set([
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
]);

export function getChineseHolidayName(name: string): string {
  const hasChinese = (s: string) => /[一-鿿]/.test(s);

  if (hasChinese(name)) {
    const part = name.split(",").find(p => hasChinese(p.trim()));
    if (part) return part.trim();
  }

  return name;
}

export function isRealHolidayName(rawName?: string): boolean {
  if (!rawName) return false;

  const name = rawName.trim();

  return (
    name !== "" &&
    name !== "工作日" &&
    name !== "周末" &&
    !ENGLISH_WEEKDAY_NAMES.has(name)
  );
}

export function resolveDayTag({
  isInLieu,
  work,
  isWeekend,
  rawName,
}: {
  isInLieu: boolean;
  work: boolean;
  isWeekend: boolean;
  rawName?: string;
}): DayTagType {
  if (isInLieu) return "inLieu";
  if (!work && isRealHolidayName(rawName)) return "rest";
  if (work && isWeekend) return "makeup";
  return null;
}
