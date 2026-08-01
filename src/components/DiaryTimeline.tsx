import React, { useState, useEffect, useRef, useCallback } from "react";
import { type TimeBlock } from "./DiaryEntryReact";
import DiaryFeedList from "./diary/DiaryFeedList";
import DiaryLoadState from "./diary/DiaryLoadState";
import { withBase } from "@/utils/withBase";

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
  density?: "comfortable" | "compact";
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
  density = "comfortable",
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
      const response = await fetch(withBase(`/api/diary/${nextPage}.json`));

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
      <DiaryFeedList
        entries={displayedEntries}
        hideYear={hideYear}
        density={density}
      />

      <DiaryLoadState
        isLoading={isLoading}
        hasMore={hasMore}
        displayedCount={displayedEntries.length}
        onLoadMore={loadMore}
      />
    </>
  );
};

export default DiaryTimeline;
