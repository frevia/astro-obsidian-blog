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
function getCalendarGridDates(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = first.getDay(); // 0=日 1=一 … 6=六
  const offset = (firstWeekday + 6) % 7; // 使周一为第一列

  const gridStart = new Date(year, month, 1 - offset);
  const total = offset + daysInMonth;
  const totalCells = Math.ceil(total / 7) * 7;

  const dates: Date[] = [];
  for (let i = 0; i < totalCells; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    dates.push(d);
  }
  return dates;
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
  month: number,
  rangeStart?: string,
  rangeEnd?: string
): Record<string, DayExtraInfo> {
  return useMemo(() => {
    const start = rangeStart ?? toYMD(new Date(year, month, 1));
    const end = rangeEnd ?? toYMD(new Date(year, month + 1, 0));
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

      const startDate = new Date(start);
      const endDate = new Date(end);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);

      for (
        const cur = new Date(startDate);
        cur.getTime() <= endDate.getTime();
        cur.setDate(cur.getDate() + 1)
      ) {
        const dateKey = toYMD(cur);
        const weekday = cur.getDay();
        const isWeekend = weekday === 0 || weekday === 6;

        const isInLieu = chineseDays.isInLieu(dateKey);
        const detail = chineseDays.getDayDetail(dateKey) as {
          name?: string;
          work?: boolean;
        };
        const work = detail?.work ?? true;

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

        const rawName = detail?.name?.trim();
        const isRealHoliday =
          rawName &&
          rawName !== "工作日" &&
          rawName !== "周末" &&
          !ENGLISH_WEEKDAY_NAMES.has(rawName);
        if (isRealHoliday) {
          result[dateKey].holidayName = getChineseHolidayName(rawName);
        }

        // 只对“特殊日”打标签：调休、节假日休、周末补班。
        // 普通周六周日（chinese-days 往往标记为 work=false 且 name=周末/weekday）不打标签，
        // 这样不会出现角标/背景色块。
        let dayTag: DayTagType = null;
        if (isInLieu) dayTag = "inLieu";
        else if (!work && isRealHoliday) dayTag = "rest";
        else if (work && isWeekend) dayTag = "makeup";
        result[dateKey].dayTag = dayTag;
      }
    } catch {
      // 日期超出 chinese-days 支持范围时忽略
    }

    return result;
  }, [year, month, rangeStart, rangeEnd]);
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
  const gridDates = useMemo(
    () => getCalendarGridDates(year, month),
    [year, month]
  );
  const gridRange = useMemo(() => {
    if (gridDates.length === 0) return null;
    return [
      toYMD(gridDates[0]),
      toYMD(gridDates[gridDates.length - 1]),
    ] as const;
  }, [gridDates]);
  const chineseDaysInfo = useChineseDaysForMonth(
    year,
    month,
    gridRange?.[0],
    gridRange?.[1]
  );

  const goPrev = () => setViewDate(new Date(year, month - 1));
  const goNext = () => setViewDate(new Date(year, month + 1));
  const goToday = () => {
    const now = new Date();
    const todayKey = toYMD(now);
    setViewDate(now);
    setSelected({ dateKey: todayKey, events: eventsByDate[todayKey] ?? [] });
  };

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
        {gridDates.map(d => {
          const dateKey = toYMD(d);
          const day = d.getDate();
          const inCurrentMonth =
            d.getFullYear() === year && d.getMonth() === month;
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
          const weekday = d.getDay();
          const isWeekend = weekday === 0 || weekday === 6;

          const dayBg =
            isToday && !tag
              ? "bg-[#5268FF] dark:bg-[#5268FF]"
              : tag === "rest"
                ? "bg-rose-50 dark:bg-rose-500/15"
                : tag === "makeup"
                  ? "bg-sky-500/15 dark:bg-sky-500/20"
                  : tag === "inLieu"
                    ? "bg-rose-50 dark:bg-rose-500/15"
                    : "hover:bg-skin-muted/30";
          const dayText =
            isToday && !tag
              ? "text-white font-medium"
              : tag === "rest" || tag === "inLieu"
                ? "text-red-600 dark:text-red-400"
                : tag === "makeup"
                  ? "text-sky-800 dark:text-sky-300"
                  : isWeekend
                    ? "text-red-600 dark:text-red-400"
                    : "text-skin-base";

          const primarySubLabel: null | {
            type: "solarTerm" | "holiday" | "lunar";
            text: string;
            title?: string;
          } = extra?.solarTerm
            ? {
                type: "solarTerm",
                text: extra.solarTerm,
                title: extra.solarTerm,
              }
            : extra?.holidayName
              ? {
                  type: "holiday",
                  text: extra.holidayName,
                  title: extra.holidayName,
                }
              : extra?.lunarDay
                ? { type: "lunar", text: extra.lunarDay }
                : null;

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => handleDayClick(dateKey, events)}
              disabled={!inCurrentMonth}
              className={[
                "relative flex flex-col items-center justify-start overflow-visible rounded-lg text-sm transition-colors",
                cellMinH,
                cellPadding,
                compact && "text-xs",
                dayBg,
                inCurrentMonth &&
                  events.length > 0 &&
                  !tag &&
                  !isToday &&
                  "hover:bg-accent/15",
                dayText,
                events.length > 0 &&
                  !tag &&
                  !isToday &&
                  "font-medium text-accent",
                !inCurrentMonth && "cursor-default opacity-45 saturate-0",
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
              aria-disabled={!inCurrentMonth}
            >
              {(tagLabel || isToday) && (
                <span
                  className={[
                    "absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 rounded leading-none font-medium shadow-sm",
                    compact
                      ? "px-0.5 py-[1px] text-[9px]"
                      : "px-0.5 py-[1px] text-[10px]",
                    tag === "rest" &&
                      "bg-red-500 text-white dark:bg-red-500 dark:text-white",
                    tag === "makeup" &&
                      "bg-sky-500/30 text-sky-800 dark:text-sky-200",
                    tag === "inLieu" &&
                      "bg-red-500 text-white dark:bg-red-500 dark:text-white",
                    isToday &&
                      !tagLabel &&
                      "bg-[#8B99FF] text-white dark:bg-[#8B99FF] dark:text-white",
                  ].join(" ")}
                >
                  {tagLabel ?? "今"}
                </span>
              )}
              <span className="leading-tight">{day}</span>
              <span
                className={[
                  "max-w-full",
                  compact ? "mt-1 h-4 text-[9px]" : "mt-1.5 h-4 text-[10px]",
                  "flex items-center justify-center",
                ].join(" ")}
              >
                {primarySubLabel ? (
                  <span
                    className={[
                      primarySubLabel.type === "lunar"
                        ? "max-w-full truncate leading-none"
                        : "max-w-full truncate rounded-sm leading-none",
                      primarySubLabel.type === "solarTerm"
                        ? isToday && !tag
                          ? "border border-white/60 bg-white/15 px-1 py-0.5 text-white"
                          : "border border-amber-500/40 bg-amber-500/15 px-1 py-0.5 text-amber-800 dark:border-amber-400/35 dark:text-amber-200"
                        : primarySubLabel.type === "holiday"
                          ? isToday && !tag
                            ? "px-0.5 text-white/90"
                            : tag === "rest"
                              ? "px-0.5 text-red-700 dark:text-red-300"
                              : tag === "inLieu"
                                ? "px-0.5 text-amber-800 dark:text-amber-200"
                                : tag === "makeup"
                                  ? "px-0.5 text-sky-700 dark:text-sky-300"
                                  : isWeekend && !tag
                                    ? "px-0.5 text-red-600/75 dark:text-red-400/75"
                                    : "text-skin-muted px-0.5"
                          : // lunar
                            isToday && !tag
                            ? "text-white/90"
                            : tag === "rest" || tag === "inLieu"
                              ? "text-red-600/90 dark:text-red-400/90"
                              : isWeekend && !tag
                                ? "text-red-600/75 dark:text-red-400/75"
                                : "text-skin-muted",
                    ].join(" ")}
                    title={primarySubLabel.title}
                  >
                    {primarySubLabel.text}
                  </span>
                ) : (
                  // 占位，保证所有格子的副标题在同一水平线
                  <span className="opacity-0">空</span>
                )}
              </span>
              {events.length > 0 && (
                <span
                  className={[
                    // 用布局占位，避免与农历/节气行重叠
                    "mt-auto rounded-full bg-accent",
                    compact ? "mb-0.5 h-1 w-1" : "mb-1 h-1.5 w-1.5",
                  ].join(" ")}
                  aria-hidden
                />
              )}
            </button>
          );
        })}
      </div>

      <div
        className={[
          compact ? "mt-3" : "mt-6",
          compact && selected
            ? "max-h-[min(52vh,28rem)] overflow-y-auto overscroll-y-contain pr-1 [scrollbar-gutter:stable]"
            : "",
        ].join(" ")}
        aria-label="选中日期的内容"
      >
        {selected ? (
          <>
            {/* 左：公历一行 + 农历月日·周几 | 右：节气（若有）+ 工作日/休息 */}
            <div
              className={[
                "bg-skin-muted/10 dark:bg-skin-muted/20 mb-3 rounded-lg",
                compact ? "p-2" : "p-3",
              ].join(" ")}
            >
              {(() => {
                const [y, m, d] = selected.dateKey.split("-");
                const yi = Number(y);
                const mi = Number(m);
                const di = Number(d);
                const weekCn =
                  WEEKDAYS[(new Date(yi, mi - 1, di).getDay() + 6) % 7];
                const info = chineseDaysInfo[selected.dateKey];
                const lunarLine =
                  info?.lunar != null && info.lunar !== ""
                    ? `${info.lunar}　周${weekCn}`
                    : `周${weekCn}`;
                return (
                  <div className="flex flex-col gap-3">
                    <div
                      className={[
                        "flex items-start",
                        compact
                          ? "flex-col gap-2 sm:flex-row sm:gap-4"
                          : "flex-row flex-nowrap gap-4 sm:gap-5",
                      ].join(" ")}
                    >
                      <div
                        className={[
                          "border-skin-muted/25 text-skin-base shrink-0",
                          compact
                            ? "w-full border-b pb-2 sm:w-auto sm:border-r sm:border-b-0 sm:pr-4 sm:pb-0"
                            : "border-r pr-4",
                        ].join(" ")}
                      >
                        <div
                          className={[
                            "font-semibold tabular-nums",
                            compact ? "text-base" : "text-lg sm:text-xl",
                          ].join(" ")}
                        >
                          {y}年{mi}月{di}日
                        </div>
                        <div className="text-skin-muted mt-0.5 text-xs leading-snug">
                          {lunarLine}
                        </div>
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 text-xs">
                        {info ? (
                          <>
                            {info.solarTerm ? (
                              <div className="leading-snug font-medium text-amber-800 dark:text-amber-400">
                                {info.solarTerm}
                              </div>
                            ) : null}
                            <div
                              className={[
                                "leading-snug",
                                info.work
                                  ? "text-skin-muted"
                                  : "text-red-600 dark:text-red-400",
                              ].join(" ")}
                            >
                              {info.work
                                ? "又是需要工作的一天！😩"
                                : "又是休息的一天！🎉"}
                            </div>
                          </>
                        ) : (
                          <p className="text-skin-muted leading-snug">
                            暂无该日信息
                          </p>
                        )}
                      </div>
                    </div>
                    {/* 距离现在多少天 - 另起一行 */}
                    <div
                      className={[
                        "text-skin-muted border-skin-muted/20 flex items-center gap-2 border-t pt-2 leading-snug",
                        // 与外层卡片的 padding 对齐，避免分隔线长短不一
                        compact ? "-mx-2" : "-mx-3",
                      ].join(" ")}
                    >
                      <span className="inline-block h-4 w-4">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <circle
                            cx="12"
                            cy="12"
                            r="9"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M12 6v6l4 2"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                      <span className="text-xs">
                        {(() => {
                          const [y, m, d] = selected.dateKey.split("-");
                          const selectedDate = new Date(
                            Number(y),
                            Number(m) - 1,
                            Number(d)
                          );
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          selectedDate.setHours(0, 0, 0, 0);
                          const diffTime =
                            today.getTime() - selectedDate.getTime();
                          const diffDays = Math.floor(
                            diffTime / (1000 * 60 * 60 * 24)
                          );
                          if (diffDays === 0) {
                            return "今天";
                          } else if (diffDays > 0) {
                            return `距离 ${y}年${m}月${d}日 已经过去${diffDays}天`;
                          } else {
                            const absDays = Math.abs(diffDays);
                            return `距离 ${y}年${m}月${d}日 还有${absDays}天`;
                          }
                        })()}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* 当日内容 */}
            <div
              className={
                compact
                  ? "border-skin-muted/20 mt-3 border-t pt-2"
                  : "border-skin-muted/20 mt-4 border-t pt-3"
              }
            >
              <div className="text-skin-muted mb-2 flex items-center gap-2 text-[11px] font-medium tracking-wide uppercase">
                <span
                  className="inline-block h-1 w-4 rounded-full bg-accent/15 text-accent"
                  aria-hidden
                />
                当日内容
              </div>
              {selected.events.length > 0 ? (
                <ul className="flex flex-col gap-1.5" role="list">
                  {selected.events.map((ev, idx) => {
                    const isDiary = ev.type === "diary";
                    const label = isDiary
                      ? "日记"
                      : ev.type === "blog" && ev.title
                        ? ev.title
                        : "文章";
                    return (
                      <li key={idx}>
                        <a
                          href={ev.url}
                          className={[
                            "group border-skin-muted/15 bg-skin-muted/5 hover:bg-skin-muted/15 dark:bg-skin-muted/10 dark:hover:bg-skin-muted/20 flex items-start gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors hover:border-accent/25",
                            compact ? "py-1.5" : "",
                          ].join(" ")}
                          title={label}
                        >
                          <span
                            className={[
                              "mt-0.5 shrink-0 rounded px-1 py-0.5 text-[10px] leading-none font-medium",
                              isDiary
                                ? "bg-violet-500/15 text-violet-700 dark:text-violet-300"
                                : "bg-sky-500/15 text-sky-800 dark:text-sky-300",
                            ].join(" ")}
                          >
                            {isDiary ? "日记" : "文章"}
                          </span>
                          <span className="text-skin-base min-w-0 flex-1 text-xs leading-snug group-hover:text-accent">
                            {isDiary ? "当日日记" : label}
                          </span>
                          <span
                            className="text-skin-muted shrink-0 text-[10px] opacity-0 transition-opacity group-hover:opacity-100"
                            aria-hidden
                          >
                            →
                          </span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="bg-skin-muted/5 text-skin-muted dark:bg-skin-muted/10 border-skin-muted/25 rounded-lg border border-dashed px-3 py-4 text-center text-xs leading-relaxed">
                  该日暂无日记或文章
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default Calendar;
