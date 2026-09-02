import React from "react";
import TimelineItemReact from "./TimelineItemReact";
import TwikooThread from "./TwikooThread";
import { parseYMDAsUTC, formatSiteDate, toSiteYMD } from "@/utils/calendarDate";
import { withBase } from "@/utils/withBase";
import type { TimeBlock } from "./diary/types";

export type { TimeBlock } from "./diary/types";

export interface DiaryEntryProps {
  date: string;
  hideYear?: boolean;
  timeBlocks: TimeBlock[];
}

const DiaryEntryReact: React.FC<DiaryEntryProps> = ({
  date,
  hideYear = false,
  timeBlocks,
}) => {
  const threadKey = `twikoo-diary-${date}`;
  const threadPath = withBase(`/diary/${date}`);

  const entryDateUTC = parseYMDAsUTC(date);

  const absoluteLabel = formatSiteDate(entryDateUTC, "zh-CN", {
    month: "2-digit",
    day: "2-digit",
  });

  const weekdayLabel = formatSiteDate(entryDateUTC, "zh-CN", {
    weekday: "short",
  });

  const yearLabel = formatSiteDate(entryDateUTC, "zh-CN", {
    year: "numeric",
  });

  const [relativeLabel, setRelativeLabel] = React.useState<string | null>(null);

  React.useLayoutEffect(() => {
    const now = new Date();
    const todayYMD = toSiteYMD(now);
    const entryYMD = toSiteYMD(entryDateUTC);
    const todayUTC = parseYMDAsUTC(todayYMD);
    const entryUTC = parseYMDAsUTC(entryYMD);

    const diffDays = Math.floor(
      (todayUTC.getTime() - entryUTC.getTime()) / 86400000
    );

    if (diffDays === 0) setRelativeLabel("今天");
    else if (diffDays === 1) setRelativeLabel("昨天");
    else if (diffDays === 2) setRelativeLabel("前天");
    else setRelativeLabel(null); // 超过范围就用 SSR 的 absoluteLabel
  }, [date]);

  return (
    <div
      className="date-group mb-5 border-b border-border/25 pb-5"
      data-pagefind-weight="2"
    >
      <header className="mb-8">
        <div className="flex items-baseline gap-3">
          <h2
            id={`date-${date}`}
            className="m-0 text-3xl leading-none font-bold text-skin-accent"
            aria-label={`${relativeLabel ?? absoluteLabel} ${weekdayLabel} ${!hideYear ? yearLabel : ""} 的碎片`}
          >
            {/* SSR 时渲染 absoluteLabel；CSR 完成后若有相对文案则替换。
               suppressHydrationWarning 防止首帧文本差异触发水合警告 */}
            <span suppressHydrationWarning>
              {relativeLabel ?? absoluteLabel}
            </span>
          </h2>
          <div className="flex flex-col" aria-hidden="true">
            <div className="text-base leading-tight font-medium text-skin-base">
              {weekdayLabel}
            </div>
            {!hideYear && (
              <div className="text-sm leading-tight text-skin-base/70">
                {yearLabel}
              </div>
            )}
          </div>
        </div>
        <div className="sr-only">
          {date} 共有 {timeBlocks.length} 个时间段的记录
        </div>
      </header>

      <div
        id={`content-${date}`}
        className="space-y-0"
        role="group"
        aria-labelledby={`date-${date}`}
      >
        {timeBlocks.map((block, index) => (
          <TimelineItemReact
            key={`${date}-${block.time}-${index}`}
            time={block.time}
            date={date}
            text={block.text}
            postText={block.postText}
            images={block.images}
            htmlContent={block.htmlContent}
            movieData={block.movieData}
            tvData={block.tvData}
            bookData={block.bookData}
            musicData={block.musicData}
            footnoteHtml={block.footnoteHtml}
          />
        ))}
      </div>
      {/* 评论与正文对齐：与时间线同结构，sm 下左侧留出与时间标签等宽的空位 */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:gap-3">
        <div
          className="hidden sm:block sm:w-0 sm:flex-shrink-0"
          aria-hidden="true"
        />
        <div className="w-full min-w-0 flex-1">
          <TwikooThread
            threadKey={threadKey}
            path={threadPath}
            collapsedWhenEmpty
          />
        </div>
      </div>
    </div>
  );
};

export default DiaryEntryReact;
