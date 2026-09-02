import React from "react";
import MediaCard from "./MediaCard";
import type { MediaCardData } from "../types/media";
import DiaryImageGallery from "./diary/DiaryImageGallery";
import type { DiaryImage } from "./diary/types";

// DiaryImageGallery owns the optional lightbox enhancement (including
// `await import("lightgallery")`) so this compatibility renderer has no
// second gallery implementation.

export interface TimelineItemProps {
  time: string;
  date?: string;
  text?: string;
  postText?: string;
  images?: DiaryImage[];
  htmlContent?: string;
  movieData?: MediaCardData;
  tvData?: MediaCardData;
  bookData?: MediaCardData;
  musicData?: MediaCardData;
  footnoteHtml?: string;
}

const TimelineItemReact: React.FC<TimelineItemProps> = ({
  time,
  date,
  text,
  postText,
  images,
  htmlContent,
  movieData,
  tvData,
  bookData,
  musicData,
  footnoteHtml,
}) => {
  return (
    <article
      className="mb-1 pb-6 last:pb-0"
      tabIndex={0}
      role="article"
      aria-label={`${time} 时间段的记录`}
    >
      <div className="content group transition-all duration-300">
        {/* 时间和内容整合显示：移动端上下排布，桌面端左右排布 */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
          {/* 时间标签 - 使用h3标题以便Pagefind识别为子结果 */}
          <h3
            id={date ? `diary-${date}-${time.replace(/:/g, "-")}` : undefined}
            className="m-0 flex-none border-b border-dashed border-border/40 pb-1 text-base font-medium text-skin-base/60 sm:flex sm:items-center sm:gap-1 sm:border-none sm:pr-2 sm:pb-0 sm:pl-0"
            aria-label={`${time} 时间段的记录`}
          >
            <span className="sr-only">{date}</span>
            <span className="inline-flex items-center gap-1">
              <span
                className="h-4 w-4 flex-none text-skin-base/60 sm:hidden"
                aria-hidden="true"
              >
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
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M12 7v5l3 2"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <time dateTime={date ? `${date}T${time}` : time}>{time}</time>
            </span>
          </h3>
          {/* 内容区域 */}
          <div className="min-w-0 flex-1">
            {/* 帖子内容 */}
            <div className="text-skin-base">
              {text && (
                <div
                  className="text-base leading-relaxed whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: text }}
                />
              )}

              {images && images.length > 0 && (
                <DiaryImageGallery images={images} htmlContent={htmlContent} />
              )}

              {htmlContent && (
                <div
                  className="html-content mt-0 mb-4 max-w-none leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: htmlContent }}
                  suppressHydrationWarning={true}
                  role="region"
                  aria-label="富文本内容"
                />
              )}

              {movieData && (
                <section
                  className="movie-card-container mb-4 px-0"
                  aria-label="电影信息"
                >
                  <MediaCard mediaData={movieData} cardType="movie" />
                </section>
              )}

              {tvData && (
                <section
                  className="tv-card-container mb-4 px-0"
                  aria-label="电视剧信息"
                >
                  <MediaCard mediaData={tvData} cardType="tv" />
                </section>
              )}

              {bookData && (
                <section
                  className="book-card-container mb-4 px-0"
                  aria-label="书籍信息"
                >
                  <MediaCard mediaData={bookData} cardType="book" />
                </section>
              )}

              {musicData && (
                <section
                  className="music-card-container mb-4 px-0"
                  aria-label="音乐信息"
                >
                  <MediaCard mediaData={musicData} cardType="music" />
                </section>
              )}

              {postText && (
                <div
                  className="mb-4 text-base leading-relaxed whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: postText }}
                />
              )}

              {/* 脚注 */}
              {footnoteHtml && (
                <div
                  className="footnotes-container mt-4"
                  dangerouslySetInnerHTML={{ __html: footnoteHtml }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};

export default TimelineItemReact;
