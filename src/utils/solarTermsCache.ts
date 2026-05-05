import solarTermsByDate from "./solarTermsByDate.json";

/** 东八区交节当日公历 → 节气中文名（与站点 YYYY-MM-DD 一致，不受读者本机时区影响） */
export function getSolarTermForSiteYMD(ymd: string): string | undefined {
  const name = (solarTermsByDate as Record<string, string>)[ymd];
  return name || undefined;
}
