import React, { useState, useMemo } from "react";
import chineseDays from "chinese-days";

export interface CalendarProps {
  /** 按日期分组的事件，key 为 YYYY-MM-DD */
  eventsByDate: Record<string, { type: string; url: string; title?: string }[]>;
  /** 紧凑模式，用于侧边栏等窄区域 */
  compact?: boolean;
}

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];

/** chinese-days getDayDetail 对普通工作日/周末返回英文星期名，不当作节假日显示 */
const ENGLISH_WEEKDAY_NAMES = new Set([
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
]);

/** 从 chinese-days 返回的 name（如 "Spring Festival,春节,4"）中只取中文名 */
function getChineseHolidayName(name: string): string {
  const hasChinese = (s: string) => /[\u4e00-\u9fff]/.test(s);
  if (hasChinese(name)) {
    const part = name.split(",").find(p => hasChinese(p.trim()));
    if (part) return part.trim();
  }
  return name;
}

function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 周一为一周第一天，返回的 grid 从左到右为 一…日 */
function getMonthDays(year: number, month: number): (number | null)[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const firstWeekday = first.getDay(); // 0=日 1=一 … 6=六
  const daysInMonth = last.getDate();
  const grid: (number | null)[] = [];
  const offset = (firstWeekday + 6) % 7; // 使周一为第一列
  for (let i = 0; i < offset; i++) grid.push(null);
  for (let d = 1; d <= daysInMonth; d++) grid.push(d);
  return grid;
}

/** 获取当月第一天和最后一天的 YYYY-MM-DD */
function getMonthRange(year: number, month: number): [string, string] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  return [toYMD(first), toYMD(last)];
}

/** 休=休息日 班=补班 调=调休日 */
export type DayTagType = "rest" | "makeup" | "inLieu" | null;

export interface DayExtraInfo {
  lunar: string;
  lunarMonth: string;
  lunarDay: string;
  solarTerm?: string;
  holidayName?: string;
  isInLieu: boolean;
  /** getDayDetail.work：是否工作日 */
  work: boolean;
  /** 用于角标与背景：休 / 班 / 调 */
  dayTag: DayTagType;
}

function useChineseDaysForMonth(
  year: number,
  month: number
): Record<string, DayExtraInfo> {
  return useMemo(() => {
    const [start, end] = getMonthRange(year, month);
    const result: Record<string, DayExtraInfo> = {};

    try {
      const lunarList = chineseDays.getLunarDatesInRange(start, end) as Array<{
        date: string;
        lunarMonCN: string;
        lunarDayCN: string;
      }>;
      for (const item of lunarList) {
        result[item.date] = {
          lunar: `${item.lunarMonCN}${item.lunarDayCN}`,
          lunarMonth: item.lunarMonCN,
          lunarDay: item.lunarDayCN,
          isInLieu: false,
          work: true,
          dayTag: null,
        };
      }

      const solarTerms = chineseDays.getSolarTermsInRange(start, end) as Array<{
        date: string;
        name: string;
        index?: number;
      }>;
      for (const st of solarTerms) {
        if (st.index === 1 && st.date) {
          if (!result[st.date])
            result[st.date] = {
              lunar: "",
              lunarMonth: "",
              lunarDay: "",
              isInLieu: false,
              work: true,
              dayTag: null,
            };
          result[st.date].solarTerm = st.name;
        }
      }

      const lastDay = new Date(year, month + 1, 0).getDate();
      const y = year;
      const m = String(month + 1).padStart(2, "0");
      for (let d = 1; d <= lastDay; d++) {
        const day = String(d).padStart(2, "0");
        const dateKey = `${y}-${m}-${day}`;
        const weekday = new Date(y, month, d).getDay();
        const isWeekend = weekday === 0 || weekday === 6;

        const isInLieu = chineseDays.isInLieu(dateKey);
        const detail = chineseDays.getDayDetail(dateKey) as {
          name?: string;
          work?: boolean;
        };
        const work = detail?.work ?? true;

        let dayTag: DayTagType = null;
        if (isInLieu) dayTag = "inLieu";
        else if (!work) dayTag = "rest";
        else if (isWeekend) dayTag = "makeup";

        if (!result[dateKey])
          result[dateKey] = {
            lunar: "",
            lunarMonth: "",
            lunarDay: "",
            isInLieu: false,
            work: true,
            dayTag: null,
          };
        result[dateKey].isInLieu = isInLieu;
        result[dateKey].work = work;
        result[dateKey].dayTag = dayTag;

        const rawName = detail?.name?.trim();
        const isRealHoliday =
          rawName &&
          rawName !== "工作日" &&
          rawName !== "周末" &&
          !ENGLISH_WEEKDAY_NAMES.has(rawName);
        if (isRealHoliday) {
          result[dateKey].holidayName = getChineseHolidayName(rawName);
        }
      }
    } catch {
      // 日期超出 chinese-days 支持范围时忽略
    }

    return result;
  }, [year, month]);
}

const Calendar: React.FC<CalendarProps> = ({
  eventsByDate,
  compact = false,
}) => {
  const [viewDate, setViewDate] = useState(() => new Date());
  const today = toYMD(new Date());
  const [selected, setSelected] = useState<{
    dateKey: string;
    events: { type: string; url: string; title?: string }[];
  }>({ dateKey: today, events: eventsByDate[today] ?? [] });

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthLabel = `${year}年${month + 1}月`;
  const grid = useMemo(() => getMonthDays(year, month), [year, month]);
  const chineseDaysInfo = useChineseDaysForMonth(year, month);

  const goPrev = () => setViewDate(new Date(year, month - 1));
  const goNext = () => setViewDate(new Date(year, month + 1));
  const goToday = () => setViewDate(new Date());

  // 当 eventsByDate 变化时，更新选中日期的事件
  React.useEffect(() => {
    setSelected(prev => ({
      dateKey: prev.dateKey,
      events: eventsByDate[prev.dateKey] ?? [],
    }));
  }, [eventsByDate]);

  const handleDayClick = (
    dateKey: string,
    events: { type: string; url: string; title?: string }[]
  ) => {
    setSelected({ dateKey, events });
  };

  const cellMinH = compact ? "min-h-[2.5rem]" : "min-h-[4.5rem]";
  const cellPadding = compact ? "p-0.5" : "p-1.5";

  return (
    <div
      className={[
        "calendar mx-auto",
        compact ? "max-w-[280px]" : "max-w-xl",
      ].join(" ")}
    >
      {!compact && (
        <div className="text-skin-muted mb-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
          <span>农历 · 节气 · 节假日（chinese-days）</span>
          <span className="flex items-center gap-3">
            <span className="rounded bg-red-500/20 px-1.5 text-red-600 dark:text-red-400">
              休
            </span>
            <span className="rounded bg-sky-500/20 px-1.5 text-sky-700 dark:text-sky-400">
              班
            </span>
            <span className="rounded bg-amber-500/25 px-1.5 text-amber-700 dark:text-amber-400">
              调
            </span>
          </span>
        </div>
      )}
      <div
        className={[
          compact ? "mb-3" : "mb-6",
          "flex items-center justify-between",
        ].join(" ")}
      >
        <h2
          className={[
            "text-skin-base font-bold",
            compact ? "text-base" : "text-2xl",
          ].join(" ")}
        >
          {monthLabel}
        </h2>
        <div
          className={
            compact ? "flex items-center gap-1" : "flex items-center gap-3"
          }
        >
          <button
            type="button"
            onClick={goPrev}
            className="text-skin-base rounded p-2 transition-colors hover:text-accent"
            aria-label="上一月"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={goToday}
            className={[
              "text-skin-muted rounded transition-colors hover:text-accent",
              compact ? "px-2 py-0.5 text-xs" : "px-3 py-1.5 text-sm",
            ].join(" ")}
          >
            今天
          </button>
          <button
            type="button"
            onClick={goNext}
            className="text-skin-base rounded p-2 transition-colors hover:text-accent"
            aria-label="下一月"
          >
            ›
          </button>
        </div>
      </div>

      <div
        className={[
          "grid grid-cols-7 overflow-visible text-center",
          compact ? "gap-x-0.5 gap-y-2" : "gap-x-2 gap-y-5",
        ].join(" ")}
      >
        {WEEKDAYS.map(w => (
          <div
            key={w}
            className={[
              "text-skin-muted font-medium",
              compact ? "py-0.5 text-[10px]" : "py-2 text-sm",
            ].join(" ")}
          >
            {w}
          </div>
        ))}
        {grid.map((day, i) => {
          if (day === null) {
            return <div key={`empty-${i}`} className={cellMinH} />;
          }
          const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const events = eventsByDate[dateKey] ?? [];
          const extra = chineseDaysInfo[dateKey];
          const isToday = toYMD(new Date()) === dateKey;
          const tag = extra?.dayTag;
          const tagLabel =
            tag === "rest"
              ? "休"
              : tag === "makeup"
                ? "班"
                : tag === "inLieu"
                  ? "调"
                  : null;
          const weekday = new Date(year, month, day).getDay();
          const isWeekend = weekday === 0 || weekday === 6;

          const dayBg =
            isToday && !tag
              ? "bg-[#5268FF] dark:bg-[#5268FF]"
              : tag === "rest"
                ? "bg-red-500/20 dark:bg-red-500/25"
                : tag === "makeup"
                  ? "bg-sky-500/15 dark:bg-sky-500/20"
                  : tag === "inLieu"
                    ? "bg-amber-500/25 dark:bg-amber-500/30"
                    : isWeekend
                      ? "bg-skin-muted/30 dark:bg-skin-muted/25"
                      : "hover:bg-skin-muted/30";
          const dayText =
            isToday && !tag
              ? "text-white font-medium"
              : tag === "rest" || tag === "inLieu"
                ? "text-red-600 dark:text-red-400"
                : tag === "makeup"
                  ? "text-sky-800 dark:text-sky-300"
                  : isWeekend
                    ? "text-skin-muted"
                    : "text-skin-base";

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => handleDayClick(dateKey, events)}
              className={[
                "relative flex flex-col items-center justify-start overflow-visible rounded-lg text-sm transition-colors",
                cellMinH,
                cellPadding,
                compact && "text-xs",
                dayBg,
                events.length > 0 && !tag && !isToday && "hover:bg-accent/15",
                dayText,
                events.length > 0 &&
                  !tag &&
                  !isToday &&
                  "font-medium text-accent",
              ].join(" ")}
              aria-label={
                [
                  dateKey,
                  extra?.lunar,
                  tagLabel,
                  extra?.holidayName,
                  extra?.solarTerm,
                ]
                  .filter(Boolean)
                  .join("，") || dateKey
              }
            >
              {(tagLabel || isToday) && (
                <span
                  className={[
                    "absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 rounded leading-none font-medium shadow-sm",
                    compact
                      ? "px-0.5 py-0.5 text-[8px]"
                      : "px-0.5 py-0.5 text-[10px]",
                    tag === "rest" &&
                      "bg-red-500/30 text-red-700 dark:text-red-300",
                    tag === "makeup" &&
                      "bg-sky-500/30 text-sky-800 dark:text-sky-200",
                    tag === "inLieu" &&
                      "bg-amber-500/40 text-amber-800 dark:text-amber-200",
                    isToday &&
                      !tagLabel &&
                      "bg-[#8B99FF] text-white dark:bg-[#8B99FF] dark:text-white",
                  ].join(" ")}
                >
                  {tagLabel ?? "今"}
                </span>
              )}
              <span className="leading-tight">{day}</span>
              {extra?.lunarDay && (
                <span
                  className={[
                    "max-w-full truncate leading-none",
                    compact ? "mt-0.5 text-[9px]" : "mt-1 text-[10px]",
                    isToday && !tag
                      ? "text-white/90"
                      : tag === "rest" || tag === "inLieu"
                        ? "text-red-600/90 dark:text-red-400/90"
                        : isWeekend && !tag
                          ? "text-skin-muted/80"
                          : "text-skin-muted",
                  ].join(" ")}
                >
                  {extra.lunarDay}
                </span>
              )}
              {extra?.holidayName && (
                <span
                  className={[
                    "max-w-full truncate rounded px-0.5 leading-none",
                    compact ? "mt-0.5 text-[9px]" : "mt-1 text-[10px]",
                    isToday && !tag
                      ? "text-white/90"
                      : tag === "rest"
                        ? "text-red-700 dark:text-red-300"
                        : tag === "inLieu"
                          ? "text-amber-800 dark:text-amber-200"
                          : tag === "makeup"
                            ? "text-sky-700 dark:text-sky-300"
                            : isWeekend && !tag
                              ? "text-skin-muted/80"
                              : "text-skin-muted",
                  ].join(" ")}
                  title={extra.holidayName}
                >
                  {extra.holidayName}
                </span>
              )}
              {extra?.solarTerm && (
                <span
                  className={[
                    "max-w-full truncate rounded px-0.5 leading-none",
                    compact ? "mt-0.5 text-[9px]" : "mt-1 text-[10px]",
                    isToday && !tag
                      ? "bg-white/20 text-white"
                      : "bg-amber-500/20 text-amber-800 dark:text-amber-200",
                  ].join(" ")}
                  title={extra.solarTerm}
                >
                  {extra.solarTerm}
                </span>
              )}
              {events.length > 0 && (
                <span
                  className="absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-accent"
                  aria-hidden
                />
              )}
            </button>
          );
        })}
      </div>

      <div
        className={["mt-3", compact ? "" : "mt-6"].join(" ")}
        aria-label="选中日期的内容"
      >
        {selected ? (
          <>
            {/* 日期标题 */}
            <div className="text-skin-base mb-2 font-medium">
              {selected.dateKey}
            </div>

            {/* 农历、节气、节假日详情 - 横向两栏排版 */}
            <div className="bg-skin-muted/10 dark:bg-skin-muted/20 mb-3 rounded-lg p-2">
              {chineseDaysInfo[selected.dateKey] && (
                <div className="flex flex-row flex-nowrap items-stretch gap-4 text-xs">
                  {/* 左侧：农历、节假日 */}
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    {chineseDaysInfo[selected.dateKey].lunar && (
                      <div className="text-skin-muted leading-tight">
                        {chineseDaysInfo[selected.dateKey].lunar}
                      </div>
                    )}
                    {chineseDaysInfo[selected.dateKey].holidayName && (
                      <div className="leading-tight text-red-600 dark:text-red-400">
                        {chineseDaysInfo[selected.dateKey].holidayName}
                      </div>
                    )}
                  </div>
                  {/* 右侧：节气、工作/休息文案 */}
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    {chineseDaysInfo[selected.dateKey].solarTerm && (
                      <div className="leading-tight text-amber-600 dark:text-amber-400">
                        今天是 {chineseDaysInfo[selected.dateKey].solarTerm}{" "}
                        节气。
                      </div>
                    )}
                    <div
                      className={[
                        "leading-tight",
                        chineseDaysInfo[selected.dateKey].work
                          ? "text-skin-base"
                          : "text-red-600 dark:text-red-400",
                      ].join(" ")}
                    >
                      {chineseDaysInfo[selected.dateKey].work
                        ? "又是需要工作的一天！😩"
                        : "又是休息的一天！🎉"}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 事件列表 */}
            <div>
              <div className="text-skin-base mb-2 text-xs font-medium">
                当日内容
              </div>
              {selected.events.length > 0 ? (
                <div className="space-y-1">
                  {selected.events.map((ev, idx) => (
                    <a
                      key={idx}
                      href={ev.url}
                      className="text-skin-base hover:bg-skin-muted/20 block flex items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors"
                    >
                      {ev.type === "diary" && <span>📝</span>}
                      {ev.type === "blog" && <span>📄</span>}
                      {ev.type === "blog" && ev.title
                        ? ev.title
                        : ev.type === "diary"
                          ? "日记"
                          : "文章"}
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-skin-muted px-2 py-2 text-xs">
                  该日暂无日记或文章
                </p>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default Calendar;
