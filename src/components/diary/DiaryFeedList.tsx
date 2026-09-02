import React from "react";
import DiaryEntryReact from "../DiaryEntryReact";
import type { ParsedEntry } from "./types";

interface DiaryFeedListProps {
  entries: ParsedEntry[];
  hideYear: boolean;
  density: "comfortable" | "compact";
}

const DiaryFeedList: React.FC<DiaryFeedListProps> = ({
  entries,
  hideYear,
  density,
}) => {
  if (entries.length === 0) {
    return (
      <article role="article" className="py-12 text-center sm:py-14">
        <div role="status" aria-live="polite">
          <div className="mb-4 text-4xl opacity-40">📝</div>
          <p className="text-lg text-skin-base opacity-70">
            还没有任何 Notes...
          </p>
          <p className="mt-2 text-sm opacity-50">开始记录您的日常吧</p>
        </div>
      </article>
    );
  }

  return (
    <>
      {entries.map((entry, index) => (
        <article
          key={`${entry.date}-${index}`}
          role="article"
          aria-labelledby={`date-${entry.date}`}
          aria-describedby={`content-${entry.date}`}
          tabIndex={0}
          className={`diary-entry-reveal -mx-3 rounded-lg border border-transparent transition-all duration-200 hover:border-border/70 hover:bg-skin-fill/30 focus:ring-skin-accent focus:ring-offset-skin-fill focus:outline-none ${density === "compact" ? "p-2" : "p-3"}`}
          style={{ animationDelay: `${Math.min(index, 8) * 70}ms` }}
        >
          <DiaryEntryReact
            date={entry.date}
            hideYear={hideYear}
            timeBlocks={entry.timeBlocks}
          />
        </article>
      ))}
    </>
  );
};

export default DiaryFeedList;
