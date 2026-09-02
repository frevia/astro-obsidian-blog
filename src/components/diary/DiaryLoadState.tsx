import React from "react";

interface DiaryLoadStateProps {
  isLoading: boolean;
  hasMore: boolean;
  displayedCount: number;
  onLoadMore: () => void;
}

const DiaryLoadState: React.FC<DiaryLoadStateProps> = ({
  isLoading,
  hasMore,
  displayedCount,
  onLoadMore,
}) => {
  if (isLoading) {
    return (
      <article role="article" className="loading py-4 text-center sm:py-6">
        <div
          role="status"
          aria-live="assertive"
          aria-label="正在加载更多 Notes 条目"
        >
          <div className="animate-pulse space-y-2">
            <div className="mx-auto h-4 w-1/4 rounded bg-skin-muted"></div>
            <div className="mx-auto h-3 w-1/6 rounded bg-skin-muted"></div>
          </div>
          <p className="mt-2 text-skin-base opacity-60">加载中...</p>
          <div className="sr-only">正在为您加载更多 Notes 内容，请稍候</div>
        </div>
      </article>
    );
  }

  if (!hasMore && displayedCount > 0) {
    return (
      <article role="article" className="no-more empty-state-card py-6">
        <div role="status" aria-live="polite">
          <div className="mb-2 text-2xl opacity-40">✨</div>
          <p className="text-skin-base opacity-70">
            已显示全部 {displayedCount} 条 Notes 记录
          </p>
          <p className="mt-1 text-sm opacity-50">没有更多内容了</p>
          <div className="sr-only">
            已显示全部 {displayedCount} 条 Notes 记录
          </div>
        </div>
      </article>
    );
  }

  if (hasMore) {
    return (
      <article role="article" className="py-6 text-center">
        <button
          onClick={onLoadMore}
          className="rounded-lg bg-skin-accent px-6 py-3 text-skin-inverted transition-colors hover:bg-skin-accent/90 focus:ring-skin-accent focus:ring-offset-skin-fill focus:outline-none"
          aria-describedby="load-more-description"
        >
          加载更多 Notes
        </button>
        <div id="load-more-description" className="sr-only">
          点击此按钮加载更多 Notes 条目，或继续向下滚动自动加载
        </div>
      </article>
    );
  }

  return null;
};

export default DiaryLoadState;
