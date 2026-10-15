import React from "react";
import TimelineItemReact from "./TimelineItemReact";
import { SITE } from "@/config";
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
    <div className="date-group notes-conversation" data-pagefind-weight="2">
      <span className="notes-author-avatar" aria-hidden="true">
        {SITE.author.slice(0, 1)}
      </span>
      <header className="notes-author-header">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <strong className="text-sm font-semibold">{SITE.author}</strong>
          <h2
            id={`date-${date}`}
            className="diary-date-accent sr-only m-0 text-sm leading-normal font-normal"
            aria-label={`${relativeLabel ?? absoluteLabel} ${weekdayLabel} ${!hideYear ? yearLabel : ""} 的 Notes`}
          >
            {/* SSR 时渲染 absoluteLabel；CSR 完成后若有相对文案则替换。
               suppressHydrationWarning 防止首帧文本差异触发水合警告 */}
            <span suppressHydrationWarning>
              {relativeLabel ?? absoluteLabel}
            </span>
          </h2>
          <div className="sr-only" aria-hidden="true">
            <div className="text-sm leading-tight text-skin-base/70">
              {weekdayLabel}
            </div>
            {!hideYear && (
              <div className="text-sm leading-tight text-skin-base/70">
                {yearLabel}
              </div>
            )}
          </div>
          <span className="sr-only">{timeBlocks[0]?.time}</span>
        </div>
        <div className="sr-only">
          {date} 共有 {timeBlocks.length} 个时间段的记录
        </div>
      </header>

      <div className="notes-day-body">
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
              relatedPostLink={block.relatedPostLink}
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
        <TwikooThread
          threadKey={threadKey}
          path={threadPath}
          mode="inline"
          timestamp={`${date} ${timeBlocks[0]?.time ?? ""}`}
        />
      </div>
    </div>
  );
};

export default DiaryEntryReact;
