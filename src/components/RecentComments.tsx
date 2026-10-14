import { useEffect, useState } from "react";
import { PUBLIC_TWIKOO_ENV_ID, PUBLIC_TWIKOO_REGION } from "astro:env/client";
import { ensureTwikooScript, type RecentComment } from "@/lib/twikoo-client";
import { commentDestination, type CommentCatalog } from "@/lib/comment-links";

export default function RecentComments({
  catalog,
  siteUrl,
}: {
  catalog: CommentCatalog;
  siteUrl: string;
}) {
  const [comments, setComments] = useState<RecentComment[]>([]);
  const [status, setStatus] = useState("loading");
  const [version, setVersion] = useState(0);
  const [limit, setLimit] = useState(20);
  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    const load = async () => {
      try {
        if (!PUBLIC_TWIKOO_ENV_ID) throw new Error("Comments unavailable");
        await ensureTwikooScript();
        if (!window.twikoo) throw new Error("Comments unavailable");
        const result = await window.twikoo.getRecentComments({
          envId: PUBLIC_TWIKOO_ENV_ID,
          region: PUBLIC_TWIKOO_REGION,
          pageSize: 100,
          includeReply: true,
        });
        if (!cancelled) {
          setComments(result);
          setStatus("ready");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [version]);
  return (
    <section aria-label="最近留言">
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          disabled={status === "loading"}
          onClick={() => setVersion(v => v + 1)}
          className="min-h-11 text-sm text-foreground/60 hover:text-accent disabled:opacity-50"
        >
          刷新
        </button>
      </div>
      {status === "loading" && (
        <p role="status" className="py-12 text-center text-foreground/60">
          正在加载留言…
        </p>
      )}
      {status === "error" && (
        <p role="alert" className="py-12 text-center text-foreground/60">
          留言暂时无法加载，请点击刷新重试。
        </p>
      )}
      {status === "ready" && comments.length === 0 && (
        <p className="py-12 text-center text-foreground/60">还没有留言。</p>
      )}
      {status === "ready" && (
        <ul className="divide-y divide-border/60">
          {comments.slice(0, limit).map(comment => {
            const destination = commentDestination(
              comment.url,
              comment.id,
              catalog,
              siteUrl
            );
            const date = new Date(comment.created);
            const content = (
              <>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-medium">{comment.nick || "访客"}</span>
                  <time
                    className="text-xs text-foreground/50"
                    dateTime={
                      Number.isNaN(date.getTime())
                        ? undefined
                        : date.toISOString()
                    }
                  >
                    {Number.isNaN(date.getTime())
                      ? ""
                      : date.toLocaleDateString("zh-CN")}
                  </time>
                </div>
                <p className="mt-2 line-clamp-3 leading-7 break-words text-foreground/80">
                  {comment.commentText || "[图片或附件]"}
                </p>
                <p className="mt-3 text-sm text-foreground/50 group-hover:text-accent">
                  {destination?.title ?? "原页面已不可用"}
                </p>
              </>
            );
            return (
              <li key={comment.id}>
                {destination ? (
                  <a
                    href={destination.href}
                    data-astro-reload
                    className="group block rounded-lg px-3 py-5 transition-colors hover:bg-accent/5 focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    {content}
                  </a>
                ) : (
                  <div className="px-3 py-5">{content}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {status === "ready" && comments.length > limit && (
        <button
          type="button"
          onClick={() => setLimit(n => n + 20)}
          className="mx-auto mt-6 block min-h-11 text-sm text-accent"
        >
          查看更多
        </button>
      )}
      {status === "ready" &&
        comments.length >= 100 &&
        limit >= comments.length && (
          <p className="mt-6 text-center text-sm text-foreground/50">
            仅展示最近 100 条留言
          </p>
        )}
    </section>
  );
}
