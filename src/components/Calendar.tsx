import React, { useState, useMemo } from "react";
import chineseDays from "chinese-days";
import {
  getYMDParts,
  getSiteYearMonth,
  parseYMDAsUTC,
  toSiteYMD,
} from "@/utils/calendarDate";
import { getSolarTermForSiteYMD } from "@/utils/solarTermsCache";
import {
  getChineseHolidayName,
  isRealHolidayName,
  resolveDayTag,
  type DayTagType,
} from "@/lib/calendar/dayMeta";

export interface CalendarProps {
  /** 按日期分组的事件，key 为 YYYY-MM-DD */
  eventsByDate: Record<string, { type: string; url: string; title?: string }[]>;
  /** 服务端生成的站点时区日期，确保 SSR 与客户端首帧一致 */
  initialDateKey: string;
  /** 紧凑模式，用于侧边栏等窄区域 */
  compact?: boolean;
}

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];
const TODAY_PANEL_DATE_FORMAT = new Intl.DateTimeFormat("zh-CN", {
  month: "long",
  day: "numeric",
  weekday: "long",
  timeZone: "Asia/Shanghai",
});

/** 从 chinese-days 返回的 name（如 "Spring Festival,春节,4"）中只取中文名 */
/** 周一为一周第一天，返回的 grid 从左到右为 一…日（全东八区时间，与站点时区的 YYYY-MM-DD 对齐） */
function getCalendarGridDates(year: number, month: number): Date[] {
  const first = new Date(Date.UTC(year, month, 1));
  const firstDayOfWeek = first.getUTCDay();
  const offset = (firstDayOfWeek + 6) % 7;
  const gridStartTs = Date.UTC(year, month, 1 - offset);
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const total = offset + daysInMonth;
  const totalCells = Math.ceil(total / 7) * 7;
  const dates: Date[] = [];
  for (let i = 0; i < totalCells; i++) {
    dates.push(new Date(gridStartTs + i * 86400000));
  }
  return dates;
}

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
    const start = rangeStart ?? toSiteYMD(new Date(Date.UTC(year, month, 1)));
    const end = rangeEnd ?? toSiteYMD(new Date(Date.UTC(year, month + 1, 0)));
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

      const [sy, sm, sd] = start.split("-").map(Number);
      const [ey, em, ed] = end.split("-").map(Number);
      const startTs = Date.UTC(sy, sm - 1, sd);
      const endTs = Date.UTC(ey, em - 1, ed);

      for (let t = startTs; t <= endTs; t += 86400000) {
        const cur = new Date(t);
        const dateKey = toSiteYMD(cur);
        const weekday = cur.getUTCDay();
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
        const solarName = getSolarTermForSiteYMD(dateKey);
        if (solarName) result[dateKey].solarTerm = solarName;

        result[dateKey].isInLieu = isInLieu;
        result[dateKey].work = work;

        const rawName = detail?.name?.trim();
        const isRealHoliday = isRealHolidayName(rawName);
        if (rawName && isRealHoliday) {
          result[dateKey].holidayName = getChineseHolidayName(rawName);
        }

        result[dateKey].dayTag = resolveDayTag({
          isInLieu,
          work,
          isWeekend,
          rawName,
        });
      }
    } catch {
      // 日期超出 chinese-days 支持范围时忽略
    }

    return result;
  }, [year, month, rangeStart, rangeEnd]);
}

const Calendar: React.FC<CalendarProps> = ({
  eventsByDate,
  initialDateKey,
  compact = false,
}) => {
  const [viewYM, setViewYM] = useState(() => {
    const { year, month } = getYMDParts(initialDateKey);
    return { year, monthIndex: month - 1 };
  });
  // SSR 与客户端水合均从同一日期键开始；挂载后再由下方 effect 校准真实「今天」。
  const [todayKey, setTodayKey] = useState(initialDateKey);
  const [selected, setSelected] = useState<{
    dateKey: string;
    events: { type: string; url: string; title?: string }[];
  } | null>(() => ({
    dateKey: initialDateKey,
    events: eventsByDate[initialDateKey] ?? [],
  }));

  const todayKeyRef = React.useRef(todayKey);
  const selectedRef = React.useRef(selected);
  const viewYMRef = React.useRef(viewYM);
  const eventsByDateRef = React.useRef(eventsByDate);
  todayKeyRef.current = todayKey;
  selectedRef.current = selected;
  viewYMRef.current = viewYM;
  eventsByDateRef.current = eventsByDate;

  // 与站点时区「今天」对齐：轮询 + 回前台 + 视图切换 + 打开日历弹窗（避免 Vercel/长挂页/ClientRouter 后仍用旧日期）
  React.useEffect(() => {
    const checkDateChange = () => {
      const currentDate = toSiteYMD(new Date());
      const tk = todayKeyRef.current;
      const sel = selectedRef.current;
      const vm = viewYMRef.current;
      const ev = eventsByDateRef.current;
      if (currentDate !== tk) {
        setTodayKey(currentDate);
        // 若详情仍跟随 SSR 首帧的「今天」，一并切换到浏览器当前日期。
        if (!sel || sel.dateKey === tk) {
          setSelected({
            dateKey: currentDate,
            events: ev[currentDate] ?? [],
          });
        }
        const todayYM = getSiteYearMonth(new Date());
        if (todayYM.year !== vm.year || todayYM.monthIndex !== vm.monthIndex) {
          setViewYM(todayYM);
        }
      } else if (!sel) {
        // 防御性兜底：详情状态被清空时恢复到今天。
        setSelected({
          dateKey: currentDate,
          events: ev[currentDate] ?? [],
        });
      }
    };

    // 页面加载时立即检查日期
    checkDateChange();

    // 每分钟检查一次日期变化
    const intervalMs = 60_000;
    const intervalId = window.setInterval(checkDateChange, intervalMs);

    // 页面从后台回到前台时检查日期
    const onVisibility = () => {
      if (document.visibilityState === "visible") checkDateChange();
    };
    document.addEventListener("visibilitychange", onVisibility);

    // 窗口重新获得焦点（切应用/锁屏恢复）时检查日期
    const onFocus = () => checkDateChange();
    window.addEventListener("focus", onFocus);

    // Safari/bfcache 恢复页面时检查日期
    const onPageShow = () => checkDateChange();
    window.addEventListener("pageshow", onPageShow);

    // Astro 客户端路由完成后检查日期
    const onPageLoad = () => checkDateChange();
    document.addEventListener("astro:page-load", onPageLoad);

    // Astro 页面切换时检查日期
    const onAfterSwap = () => checkDateChange();
    document.addEventListener("astro:after-swap", onAfterSwap);

    // 日历弹窗打开时检查日期
    const onModalOpen = () => checkDateChange();
    document.addEventListener("calendar-modal-open", onModalOpen);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("astro:page-load", onPageLoad);
      document.removeEventListener("astro:after-swap", onAfterSwap);
      document.removeEventListener("calendar-modal-open", onModalOpen);
    };
  }, []);

  const { year, monthIndex: month } = viewYM;
  const monthLabel = `${year}年${month + 1}月`;
  const gridDates = useMemo(
    () => getCalendarGridDates(year, month),
    [year, month]
  );
  const gridRange = useMemo(() => {
    if (gridDates.length === 0) return null;
    return [
      toSiteYMD(gridDates[0]),
      toSiteYMD(gridDates[gridDates.length - 1]),
    ] as const;
  }, [gridDates]);
  const chineseDaysInfo = useChineseDaysForMonth(
    year,
    month,
    gridRange?.[0],
    gridRange?.[1]
  );

  const goPrev = () =>
    setViewYM(({ year: y, monthIndex: m }) =>
      m === 0 ? { year: y - 1, monthIndex: 11 } : { year: y, monthIndex: m - 1 }
    );
  const goNext = () =>
    setViewYM(({ year: y, monthIndex: m }) =>
      m === 11 ? { year: y + 1, monthIndex: 0 } : { year: y, monthIndex: m + 1 }
    );
  const goToday = () => {
    const now = new Date();
    const key = toSiteYMD(now);
    setViewYM(getSiteYearMonth(now));
    setSelected({ dateKey: key, events: eventsByDate[key] ?? [] });
  };

  // 当 eventsByDate 变化时，更新选中日期的事件
  React.useEffect(() => {
    setSelected(prev =>
      prev
        ? {
            dateKey: prev.dateKey,
            events: eventsByDate[prev.dateKey] ?? [],
          }
        : prev
    );
  }, [eventsByDate]);

  const handleDayClick = (
    dateKey: string,
    events: { type: string; url: string; title?: string }[]
  ) => {
    setSelected({ dateKey, events });
  };

  const cellMinH = compact ? "min-h-[2.5rem]" : "min-h-[4.5rem]";
  const cellPadding = compact ? "p-0.5" : "p-1.5";
  const todayInfo = chineseDaysInfo[todayKey];
  const todayEvents = eventsByDate[todayKey] ?? [];
  const todayEventCount = todayEvents.length;
  const todayDate = parseYMDAsUTC(todayKey);
  const todayPanelPrimary =
    todayInfo?.solarTerm ??
    todayInfo?.holidayName ??
    (todayInfo?.lunar ? `农历 ${todayInfo.lunar}` : "今日");

  return (
    <div
      className={[
        "calendar mx-auto",
        compact ? "max-w-[280px]" : "max-w-xl",
      ].join(" ")}
    >
      {compact ? (
        <section
          className="mb-4 rounded-lg border border-border/40 bg-surface-muted p-3"
          aria-labelledby="calendar-today-panel-title"
          data-calendar-today-panel
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p
                id="calendar-today-panel-title"
                className="text-xs font-medium tracking-wide text-foreground-muted"
              >
                今天
              </p>
              <p className="mt-1 text-lg leading-tight font-semibold text-foreground tabular-nums">
                {TODAY_PANEL_DATE_FORMAT.format(todayDate)}
              </p>
            </div>
            <div className="shrink-0 rounded-md bg-accent/10 px-2 py-1 text-center text-accent">
              <span className="block text-[10px] leading-none">日</span>
              <span className="block text-base leading-tight font-semibold tabular-nums">
                {getYMDParts(todayKey).day}
              </span>
            </div>
          </div>
          <div className="mt-3 grid gap-2 text-xs">
            <p className="leading-snug text-foreground">
              <span className="font-medium">{todayPanelPrimary}</span>
              {todayInfo?.solarTerm && todayInfo.holidayName
                ? ` · ${todayInfo.holidayName}`
                : todayInfo?.solarTerm && todayInfo.lunar
                  ? ` · 农历 ${todayInfo.lunar}`
                  : ""}
            </p>
            <p className="leading-snug text-foreground-muted">
              {todayEventCount > 0
                ? `当天有 ${todayEventCount} 条 Notes 或文章可回看。`
                : "当天暂无 Notes 或文章，翻阅日历可回看历史记录。"}
            </p>
            <p className="leading-snug text-foreground-muted">
              {todayInfo
                ? todayInfo.work
                  ? "今日按工作日记录。"
                  : "今日按休息日记录。"
                : "暂无当天节假日数据。"}
            </p>
          </div>
        </section>
      ) : null}
      {!compact && (
        <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-foreground-muted">
          <span>农历 · 节气 · 节假日（chinese-days）</span>
          <span className="flex items-center gap-3">
            <span className="rounded bg-danger/15 px-1.5 text-danger">休</span>
            <span className="rounded bg-success/15 px-1.5 text-success">
              班
            </span>
            <span className="rounded bg-warning/15 px-1.5 text-warning">
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
            "font-bold text-foreground",
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
            className="rounded p-2 text-foreground transition-colors hover:text-accent"
            aria-label="上一月"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={goToday}
            className={[
              "rounded text-foreground-muted transition-colors hover:text-accent",
              compact ? "px-2 py-0.5 text-xs" : "px-3 py-1.5 text-sm",
            ].join(" ")}
          >
            今天
          </button>
          <button
            type="button"
            onClick={goNext}
            className="rounded p-2 text-foreground transition-colors hover:text-accent"
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
              "font-medium text-foreground-muted",
              compact ? "py-0.5 text-[10px]" : "py-2 text-sm",
            ].join(" ")}
          >
            {w}
          </div>
        ))}
        {gridDates.map(d => {
          const dateKey = toSiteYMD(d);
          const { year: keyYear, month: keyMonth, day } = getYMDParts(dateKey);
          const inCurrentMonth = keyYear === year && keyMonth === month + 1;
          const events = eventsByDate[dateKey] ?? [];
          const extra = chineseDaysInfo[dateKey];
          const isToday = todayKey === dateKey;
          const tag = extra?.dayTag;
          const tagLabel =
            tag === "rest"
              ? "休"
              : tag === "makeup"
                ? "班"
                : tag === "inLieu"
                  ? "调"
                  : null;
          const weekday = parseYMDAsUTC(dateKey).getUTCDay();
          const isWeekend = weekday === 0 || weekday === 6;

          const dayBg = isToday
            ? "bg-accent shadow-sm"
            : tag === "rest"
              ? "bg-danger/10"
              : tag === "makeup"
                ? "bg-success/10"
                : tag === "inLieu"
                  ? "bg-warning/10"
                  : "hover:bg-interactive-hover";
          const dayText = isToday
            ? "font-medium text-white"
            : tag === "rest" || tag === "inLieu"
              ? "text-danger"
              : tag === "makeup"
                ? "text-success"
                : isWeekend
                  ? "text-danger"
                  : "text-foreground";

          const cornerBadgeText = tagLabel ?? (isToday ? "今" : null);

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
              {cornerBadgeText && (
                <span
                  className={[
                    "absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 rounded leading-none font-medium shadow-sm",
                    compact
                      ? "px-0.5 py-[1px] text-[9px]"
                      : "px-0.5 py-[1px] text-[10px]",
                    tag === "rest" && "bg-danger text-background",
                    tag === "makeup" && "bg-success/25 text-success",
                    tag === "inLieu" && "bg-danger text-background",
                    isToday &&
                      !tagLabel &&
                      "bg-accent/75 text-background ring-1 ring-background/35",
                  ].join(" ")}
                >
                  {cornerBadgeText}
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
                        ? isToday
                          ? "border border-white/60 bg-white/15 px-1 py-0.5 text-white"
                          : "border border-warning/40 bg-warning/15 px-1 py-0.5 text-warning"
                        : primarySubLabel.type === "holiday"
                          ? isToday
                            ? "px-0.5 text-white/90"
                            : tag === "rest"
                              ? "px-0.5 text-danger"
                              : tag === "inLieu"
                                ? "px-0.5 text-warning"
                                : tag === "makeup"
                                  ? "px-0.5 text-success"
                                  : isWeekend && !tag
                                    ? "px-0.5 text-danger/75"
                                    : "px-0.5 text-foreground-muted"
                          : // lunar
                            isToday
                            ? "text-white/90"
                            : tag === "rest" || tag === "inLieu"
                              ? "text-danger/90"
                              : isWeekend && !tag
                                ? "text-danger/75"
                                : "text-foreground-muted",
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
            ? "max-h-[min(52vh,28rem)] [scrollbar-gutter:stable] overflow-y-auto overscroll-y-contain pr-1"
            : "",
        ].join(" ")}
        aria-label="选中日期的内容"
      >
        {selected ? (
          <>
            {/* 左：公历一行 + 农历月日·周几 | 右：节气（若有）+ 工作日/休息 */}
            <div
              className={[
                "mb-3 rounded-lg bg-surface-muted",
                compact ? "p-2" : "p-3",
              ].join(" ")}
            >
              {(() => {
                const [y, m, d] = selected.dateKey.split("-");
                const yi = Number(y);
                const mi = Number(m);
                const di = Number(d);
                const weekCn =
                  WEEKDAYS[
                    (new Date(Date.UTC(yi, mi - 1, di)).getUTCDay() + 6) % 7
                  ];
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
                          "shrink-0 border-border/25 text-foreground",
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
                        <div className="mt-0.5 text-xs leading-snug text-foreground-muted">
                          {lunarLine}
                        </div>
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 text-xs">
                        {info ? (
                          <>
                            {info.solarTerm ? (
                              <div className="leading-snug font-medium text-warning">
                                {info.solarTerm}
                              </div>
                            ) : null}
                            <div
                              className={[
                                "leading-snug",
                                info.work
                                  ? "text-foreground-muted"
                                  : "text-danger",
                              ].join(" ")}
                            >
                              {info.work
                                ? "又是需要工作的一天！😩"
                                : "又是休息的一天！🎉"}
                            </div>
                          </>
                        ) : (
                          <p className="leading-snug text-foreground-muted">
                            暂无该日信息
                          </p>
                        )}
                      </div>
                    </div>
                    {/* 距离现在多少天 - 另起一行 */}
                    <div
                      className={[
                        "flex items-center gap-2 border-t border-border/20 pt-2 leading-snug text-foreground-muted",
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
                          const diffDays = Math.floor(
                            (parseYMDAsUTC(todayKey).getTime() -
                              parseYMDAsUTC(selected.dateKey).getTime()) /
                              86400000
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
                  ? "mt-3 border-t border-border/20 pt-2"
                  : "mt-4 border-t border-border/20 pt-3"
              }
            >
              <div className="mb-2 flex items-center gap-2 text-[11px] font-medium tracking-wide text-foreground-muted uppercase">
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
                      ? "Notes"
                      : ev.type === "blog" && ev.title
                        ? ev.title
                        : "文章";
                    return (
                      <li key={idx}>
                        <a
                          href={ev.url}
                          className={[
                            "group flex items-start gap-2.5 rounded-lg border border-border/15 bg-surface-muted/80 px-2.5 py-2 text-left transition-colors hover:border-accent/25 hover:bg-interactive-hover dark:bg-surface-muted dark:hover:bg-interactive-hover",
                            compact ? "py-1.5" : "",
                          ].join(" ")}
                          title={label}
                        >
                          <span
                            className={[
                              "mt-0.5 shrink-0 rounded px-1 py-0.5 text-[10px] leading-none font-medium",
                              isDiary
                                ? "bg-violet-500/15 text-violet-700 dark:text-violet-300"
                                : "bg-teal-500/15 text-teal-800 dark:text-teal-200",
                            ].join(" ")}
                          >
                            {isDiary ? "Notes" : "文章"}
                          </span>
                          <span className="min-w-0 flex-1 text-xs leading-snug text-foreground group-hover:text-accent">
                            {isDiary ? "当日 Notes" : label}
                          </span>
                          <span
                            className="shrink-0 text-[10px] text-foreground-muted opacity-0 transition-opacity group-hover:opacity-100"
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
                <div className="rounded-lg border border-dashed border-border bg-surface-muted px-3 py-4 text-center text-xs leading-relaxed text-foreground-muted">
                  该日暂无 Notes 或文章
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
