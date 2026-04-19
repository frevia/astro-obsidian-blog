import React, { useState, useEffect, useRef, useCallback } from "react";
import DiaryEntryReact, { type TimeBlock } from "./DiaryEntryReact";

export interface ParsedEntry {
  date: string;
  timeBlocks: TimeBlock[];
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  hasMore: boolean;
  itemsPerPage: number;
}

export interface DiaryTimelineProps {
  initialEntries: ParsedEntry[];
  paginationInfo: PaginationInfo;
  hideYear?: boolean;
}

const DiaryTimeline: React.FC<DiaryTimelineProps> = ({
  initialEntries = [],
  paginationInfo = {
    currentPage: 1,
    totalPages: 1,
    hasMore: false,
    itemsPerPage: 5,
  },
  hideYear = false,
}) => {
  const [displayedEntries, setDisplayedEntries] = useState<ParsedEntry[]>(
    initialEntries || []
  );
  const [currentPage, setCurrentPage] = useState(
    paginationInfo?.currentPage || 1
  );
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(paginationInfo?.hasMore || false);

  // 使用 ref 来存储最新的状态值，避免闭包问题
  const isLoadingRef = useRef(false);
  const hasMoreRef = useRef(paginationInfo?.hasMore || false);
  const currentPageRef = useRef(paginationInfo?.currentPage || 1);
  const loadingRequestRef = useRef<Set<number>>(new Set()); // 记录正在请求的页面
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 更新 ref 值
  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  const loadMore = useCallback(async () => {
    if (isLoadingRef.current || !hasMoreRef.current) return;

    const nextPage = currentPageRef.current + 1;

    // 检查是否已经在请求这个页面
    if (loadingRequestRef.current.has(nextPage)) {
      return;
    }

    setIsLoading(true);
    loadingRequestRef.current.add(nextPage);

    try {
      const response = await fetch(`/api/diary/${nextPage}.json`);

      if (!response.ok) {
        throw new Error("Failed to fetch diary entries");
      }

      const data = await response.json();

      if (data.entries && data.entries.length > 0) {
        setDisplayedEntries(prev => [...prev, ...data.entries]);
        setCurrentPage(nextPage);
        setHasMore(data.pagination.hasMore);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error loading more entries:", error);
      setHasMore(false);
    } finally {
      loadingRequestRef.current.delete(nextPage);
      setIsLoading(false);
    }
  }, []);

  // 监听滚动事件，实现无限滚动
  useEffect(() => {
    const handleScroll = () => {
      // 清除之前的定时器
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // 防抖处理，延迟执行
      scrollTimeoutRef.current = setTimeout(() => {
        if (
          window.innerHeight + document.documentElement.scrollTop >=
          document.documentElement.offsetHeight - 1000
        ) {
          loadMore();
        }
      }, 100); // 100ms 防抖
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [loadMore]);

  // 更新父容器的 aria-busy 状态
  useEffect(() => {
    const feedElement = document.getElementById("diary-content");
    if (feedElement) {
      feedElement.setAttribute("aria-busy", isLoading.toString());
    }
  }, [isLoading]);

  return (
    <>
      {displayedEntries.map((entry, index) => (
        <article
          key={`${entry.date}-${index}`}
          role="article"
          aria-labelledby={`date-${entry.date}`}
          aria-describedby={`content-${entry.date}`}
          tabIndex={0}
          className="focus:ring-skin-accent focus:ring-offset-skin-fill hover:bg-skin-fill/30 -mx-4 rounded-lg p-4 transition-all duration-200 focus:outline-none"
        >
          <DiaryEntryReact
            date={entry.date}
            hideYear={hideYear}
            timeBlocks={entry.timeBlocks}
          />
        </article>
      ))}

      {displayedEntries.length === 0 && (
        <article role="article" className="py-16 text-center sm:py-20">
          <div role="status" aria-live="polite">
            <div className="mb-4 text-4xl opacity-40">📝</div>
            <p className="text-skin-base text-lg opacity-70">
              还没有任何碎片...
            </p>
            <p className="mt-2 text-sm opacity-50">开始记录您的日常吧</p>
          </div>
        </article>
      )}

      {isLoading && (
        <article role="article" className="loading py-6 text-center sm:py-8">
          <div
            role="status"
            aria-live="assertive"
            aria-label="正在加载更多碎片条目"
          >
            <div className="animate-pulse space-y-2">
              <div className="bg-skin-muted mx-auto h-4 w-1/4 rounded"></div>
              <div className="bg-skin-muted mx-auto h-3 w-1/6 rounded"></div>
            </div>
            <p className="text-skin-base mt-2 opacity-60">加载中...</p>
            <div className="sr-only">正在为您加载更多碎片内容，请稍候</div>
          </div>
        </article>
      )}

      {!hasMore && displayedEntries.length > 0 && (
        <article role="article" className="no-more py-8 text-center">
          <div role="status" aria-live="polite">
            <div className="mb-2 text-2xl opacity-40">✨</div>
            <p className="text-skin-base opacity-70">
              已显示全部 {displayedEntries.length} 条碎片记录
            </p>
            <p className="mt-1 text-sm opacity-50">没有更多内容了</p>
            <div className="sr-only">
              已显示全部 {displayedEntries.length} 条碎片记录
            </div>
          </div>
        </article>
      )}

      {/* 手动加载更多按钮，为键盘用户提供替代方案 */}
      {hasMore && !isLoading && (
        <article role="article" className="py-8 text-center">
          <button
            onClick={loadMore}
            className="bg-skin-accent text-skin-inverted hover:bg-skin-accent/90 focus:ring-skin-accent focus:ring-offset-skin-fill rounded-lg px-6 py-3 transition-colors focus:outline-none"
            aria-describedby="load-more-description"
          >
            加载更多碎片
          </button>
          <div id="load-more-description" className="sr-only">
            点击此按钮加载更多碎片条目，或继续向下滚动自动加载
          </div>
        </article>
      )}
    </>
  );
};

export default DiaryTimeline;
