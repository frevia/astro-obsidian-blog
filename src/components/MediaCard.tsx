import React from "react";
import type { MediaCardProps } from "../types/media";
import { formatInTimeZone } from "@/utils/calendarDate";

const MediaCard: React.FC<MediaCardProps> = ({
  mediaData,
  theme = "light",
  cardType = "movie",
}) => {
  const {
    id,
    title,
    release_date,
    region,
    rating,
    runtime,
    genres,
    overview,
    poster,
    author,
    album,
    duration,
    url,
    source,
    external_url,
  } = mediaData;

  const posterUrl = poster || "";
  const mediaRating = rating ? Math.round(rating * 10) / 10 : 0;

  const formatRuntime = (minutes?: number) => {
    if (!minutes) return "";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const formatReleaseDate = (dateStr?: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return formatInTimeZone(date, "zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const getCardUrl = () => {
    if (cardType === "music" && url) {
      return url;
    } else if (external_url) {
      // 如果有external_url，优先使用
      return external_url;
    } else if (id) {
      let baseUrl;
      if (cardType === "tv") {
        // 根据source决定TV剧集的链接
        if (source === "douban") {
          baseUrl = "https://movie.douban.com/subject/";
        } else {
          baseUrl = "https://www.themoviedb.org/tv/";
        }
      } else if (cardType === "book") {
        baseUrl = "https://book.douban.com/subject/";
      } else {
        // 电影类型，根据source决定链接
        if (source === "douban") {
          baseUrl = "https://movie.douban.com/subject/";
        } else {
          baseUrl = "https://www.themoviedb.org/movie/";
        }
      }
      return `${baseUrl}${id}`;
    }
    return "#";
  };

  return (
    <a
      href={getCardUrl()}
      target="_blank"
      rel="noopener noreferrer"
      data-media-type={cardType}
      className={`media-card ${theme === "dark" ? "dark" : "light"} block w-full max-w-app cursor-pointer rounded-xl border border-border/80 bg-surface shadow-sm no-underline transition-[border-color,box-shadow] duration-200 hover:border-accent/50 hover:shadow-md`}
    >
      <div className="flex items-start gap-3 p-3 sm:gap-4 sm:p-4">
        {/* 海报图片 - 左侧 */}
        {posterUrl && (
          <div className="relative w-20 flex-shrink-0 sm:w-24">
            <img
              src={posterUrl}
              alt={title}
              className={`my-0 w-full rounded-md object-cover shadow-sm ${
                cardType === "music" ? "aspect-square" : "aspect-[2/3]"
              }`}
            />
          </div>
        )}

        {/* 媒体信息 - 右侧 */}
        <div className="min-w-0 flex-1">
          {/* 标题和评分 */}
          <div className="mb-2 flex items-start justify-between gap-2 sm:mb-3">
            <div className="min-w-0 flex-1">
              <div className="mb-1.5">
                <h3 className="text-skin-accent mt-0 line-clamp-2 text-base leading-snug font-bold sm:text-xl">
                  {title}
                </h3>
              </div>

              <div className="text-skin-base/70 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs sm:text-sm">
                {cardType === "music" ? (
                  <>
                    {author && <span>{author}</span>}
                    {album && <span>{`• ${album}`}</span>}
                    {duration && <span>{`• ${formatDuration(duration)}`}</span>}
                  </>
                ) : (
                  <>
                    {release_date && (
                      <>
                        <span>{formatReleaseDate(release_date)}</span>
                        <span>
                          {(cardType === "book" ? author : region) &&
                            ` (${cardType === "book" ? author : region})`}
                        </span>
                      </>
                    )}
                    {runtime && <span>{`• ${formatRuntime(runtime)}`}</span>}
                  </>
                )}
              </div>
            </div>

            {/* 类型徽标和评分 */}
            <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
              {/* 评分 */}
              {mediaRating > 0 && cardType !== "music" && (
                <div className="flex items-center gap-1">
                  <div className="flex items-center">
                    {Array.from({ length: 5 }, (_, star) => {
                      const starRating = mediaRating / 2;
                      const isFull = star < Math.floor(starRating);
                      const isHalf =
                        star === Math.floor(starRating) &&
                        starRating % 1 >= 0.5;
                      const starClipId = `half-star-${id ?? title}-${star}`;

                      return (
                        <div key={star} className="relative h-3 w-3">
                          <svg
                            className="h-3 w-3"
                            viewBox="0 0 20 20"
                            fill="none"
                          >
                            <defs>
                              <clipPath id={starClipId}>
                                <rect x="0" y="0" width="10" height="20" />
                              </clipPath>
                            </defs>

                            {/* 背景星星（灰色） */}
                            <path
                              d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                              fill="var(--border)"
                            />

                            {/* 满星或半星 */}
                            {isFull && (
                              <path
                                d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                                fill="#fbbf24"
                              />
                            )}

                            {/* 半星（使用SVG clipPath） */}
                            {isHalf && (
                              <path
                                d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                                fill="#fbbf24"
                                clipPath={`url(#${starClipId})`}
                              />
                            )}
                          </svg>
                        </div>
                      );
                    })}
                  </div>
                  <span className="text-skin-accent text-sm font-semibold">
                    {mediaRating.toFixed(1)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 类型标签 */}
          <div className="mb-2 flex flex-wrap gap-1.5 sm:mb-3">
            {genres &&
              genres.split(/[,，]/).map((genre, index) => (
                <span
                  key={index}
                  className="rounded-full border border-accent/20 bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent transition-colors hover:bg-accent/15 sm:px-2.5 sm:py-1 sm:text-xs"
                >
                  {genre.trim()}
                </span>
              ))}
          </div>

          {/* 简介 */}
          {overview && cardType !== "music" && (
            <div className="mb-2">
              <p
                className="text-skin-base/80 mb-0 line-clamp-2 text-left text-xs leading-relaxed sm:text-sm"
                style={{
                  display: "-webkit-box",
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {overview}
              </p>
            </div>
          )}
        </div>
      </div>
    </a>
  );
};

export default MediaCard;
