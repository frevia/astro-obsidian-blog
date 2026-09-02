import React, { useCallback, useEffect, useRef, useState } from "react";
import DiaryFeedList from "./DiaryFeedList";
import DiaryLoadState from "./DiaryLoadState";
import type { ParsedEntry, PaginationInfo } from "./types";
import { withBase } from "@/utils/withBase";

export interface DiaryLoadMoreProps {
  paginationInfo: PaginationInfo;
  initialCount: number;
  hideYear?: boolean;
  density?: "comfortable" | "compact";
}

interface DiaryPageResponse {
  entries?: ParsedEntry[];
  pagination?: PaginationInfo;
}

/**
 * Keeps the first page outside React. This island owns only entries fetched
 * after the static Astro feed and the controls needed to request them.
 */
const DiaryLoadMore: React.FC<DiaryLoadMoreProps> = ({
  paginationInfo,
  initialCount,
  hideYear = false,
  density = "comfortable",
}) => {
  const [additionalEntries, setAdditionalEntries] = useState<ParsedEntry[]>([]);
  const [currentPage, setCurrentPage] = useState(
    paginationInfo?.currentPage || 1
  );
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(paginationInfo?.hasMore || false);

  const isLoadingRef = useRef(false);
  const hasMoreRef = useRef(paginationInfo?.hasMore || false);
  const currentPageRef = useRef(paginationInfo?.currentPage || 1);
  const loadingRequestRef = useRef<Set<number>>(new Set());
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    if (loadingRequestRef.current.has(nextPage)) return;

    isLoadingRef.current = true;
    loadingRequestRef.current.add(nextPage);
    setIsLoading(true);

    try {
      const response = await fetch(withBase(`/api/diary/${nextPage}.json`));
      if (!response.ok) throw new Error("Failed to fetch diary entries");

      const data = (await response.json()) as DiaryPageResponse;
      const entries = Array.isArray(data.entries) ? data.entries : [];
      const nextPagination = data.pagination;

      if (entries.length > 0 && nextPagination) {
        setAdditionalEntries(previous => [...previous, ...entries]);
        setCurrentPage(nextPage);
        currentPageRef.current = nextPage;
        setHasMore(nextPagination.hasMore);
        hasMoreRef.current = nextPagination.hasMore;
      } else {
        setHasMore(false);
        hasMoreRef.current = false;
      }
    } catch (error) {
      console.error("Error loading more entries:", error);
      // A failed page should stop automatic retries until the page is reloaded.
      setHasMore(false);
      hasMoreRef.current = false;
    } finally {
      loadingRequestRef.current.delete(nextPage);
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);

      scrollTimeoutRef.current = setTimeout(() => {
        if (
          window.innerHeight + document.documentElement.scrollTop >=
          document.documentElement.offsetHeight - 1000
        ) {
          void loadMore();
        }
      }, 100);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [loadMore]);

  useEffect(() => {
    const feedElement = document.getElementById("diary-content");
    if (feedElement) feedElement.setAttribute("aria-busy", String(isLoading));
  }, [isLoading]);

  return (
    <>
      {additionalEntries.length > 0 && (
        <DiaryFeedList
          entries={additionalEntries}
          hideYear={hideYear}
          density={density}
        />
      )}
      <DiaryLoadState
        isLoading={isLoading}
        hasMore={hasMore}
        displayedCount={initialCount + additionalEntries.length}
        onLoadMore={() => void loadMore()}
      />
    </>
  );
};

export default DiaryLoadMore;
