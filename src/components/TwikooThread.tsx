import { useEffect, useRef, useState } from "react";
import {
  PUBLIC_TWIKOO_ENV_ID,
  PUBLIC_TWIKOO_REGION,
  PUBLIC_TWIKOO_LANG,
} from "astro:env/client";
import { SITE } from "@/config";

import {
  ensureTwikooScript,
  ensureTwikooStyle,
  type TwikooGetCommentsCountOptions,
} from "@/lib/twikoo-client";
import { readCommentTarget } from "@/lib/comment-links";
import { locateComment } from "@/lib/locate-comment";

interface TwikooThreadProps {
  threadKey: string;
  path: string;
  /** Inline panels open on demand; page panels are immediately visible. */
  mode?: "page" | "inline";
}

export default function TwikooThread({
  threadKey,
  path,
  mode = "page",
}: TwikooThreadProps) {
  const collapsedWhenEmpty = mode === "inline";
  const commentsEnabled = SITE.comments.enabled;
  const envId = PUBLIC_TWIKOO_ENV_ID?.trim();
  const hasRequiredEnv = Boolean(envId);
  const [expanded, setExpanded] = useState(!collapsedWhenEmpty);
  const shell = useRef<HTMLDivElement>(null);
  const [activated, setActivated] = useState(!collapsedWhenEmpty);
  const [status, setStatus] = useState("loading");
  const [commentCount, setCommentCount] = useState<number | null>(null);

  const [target, setTarget] = useState<{ id: string; path: string } | null>(
    null
  );
  const [targetResolved, setTargetResolved] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  useEffect(() => {
    const sync = () => {
      setTargetResolved(true);
      // An inline thread must be explicitly addressed, not every note on the page.
      const next =
        collapsedWhenEmpty &&
        !new URLSearchParams(location.search).has("thread")
          ? null
          : readCommentTarget(path, location.search, location.hash);
      const existingAnchor = document.getElementById(location.hash.slice(1));
      if (
        !new URLSearchParams(location.search).has("comment") &&
        existingAnchor &&
        !existingAnchor.matches(".tk-comment")
      )
        return;
      setTarget(previous =>
        previous?.id === next?.id && previous?.path === next?.path
          ? previous
          : next
      );
      if (next) {
        setExpanded(true);
        setActivated(true);
      }
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [path, collapsedWhenEmpty]);

  // 获取评论数量
  useEffect(() => {
    if (!commentsEnabled || !hasRequiredEnv || !collapsedWhenEmpty) return;
    const resolvedEnvId = envId;
    if (!resolvedEnvId) return;

    const checkCount = async () => {
      try {
        ensureTwikooStyle();
        await ensureTwikooScript();
        if (!window.twikoo?.getCommentsCount) return;
        const opts: TwikooGetCommentsCountOptions = {
          envId: resolvedEnvId,
          urls: [path],
          includeReply: false,
        };
        if (
          PUBLIC_TWIKOO_REGION &&
          (PUBLIC_TWIKOO_REGION === "ap-shanghai" ||
            PUBLIC_TWIKOO_REGION === "ap-guangzhou")
        ) {
          opts.region = PUBLIC_TWIKOO_REGION;
        }
        const res = await window.twikoo.getCommentsCount(opts);
        // 返回顺序与 urls 一致，只传了一个 path 故取 res[0]
        const count = res?.[0]?.count ?? 0;
        setCommentCount(count);
      } catch {
        // 忽略错误，保持折叠
      }
    };

    checkCount();
  }, [path, collapsedWhenEmpty, commentsEnabled, hasRequiredEnv, envId]);

  useEffect(() => {
    if (!commentsEnabled || !envId || !activated || !targetResolved) return;
    const host = shell.current;
    if (!host) return;
    let cancelled = false;
    let stopLocating: (() => void) | undefined;
    const init = async () => {
      try {
        ensureTwikooStyle();
        await ensureTwikooScript();
        if (cancelled || !window.twikoo) return;
        const mount = document.createElement("div");
        mount.id = `${threadKey}-mount`;
        host.appendChild(mount);
        await window.twikoo.init({
          envId,
          el: `#${mount.id}`,
          path: target?.path ?? path,
          lang: PUBLIC_TWIKOO_LANG || "zh-CN",
          ...(PUBLIC_TWIKOO_REGION ? { region: PUBLIC_TWIKOO_REGION } : {}),
        });
        if (cancelled) return;
        if (host.contains(document.activeElement))
          (document.activeElement as HTMLElement)?.blur();
        host
          .querySelectorAll<HTMLTextAreaElement>("textarea")
          .forEach(input => {
            // Twikoo shares one draft across paths; never copy it into a new Notes thread.
            if (collapsedWhenEmpty && input.value) {
              const sharedDraft = localStorage.getItem("twikoo-draft");
              input.value = "";
              input.dispatchEvent(new Event("input", { bubbles: true }));
              if (sharedDraft !== null)
                localStorage.setItem("twikoo-draft", sharedDraft);
            }
            if (!input.placeholder) input.placeholder = "写下你的评论…";
            input.setAttribute("aria-label", "评论内容");
            if (input.value)
              input
                .closest(".tk-submit")
                ?.setAttribute("data-editor-expanded", "");
          });
        setStatus("ready");
        if (target)
          stopLocating = locateComment(host, target.id, setLocationMessage);
      } catch {
        if (!cancelled) setStatus("error");
      }
    };
    void init();
    return () => {
      cancelled = true;
      stopLocating?.();
      host.replaceChildren();
    };
  }, [
    threadKey,
    path,
    activated,
    commentsEnabled,
    envId,
    collapsedWhenEmpty,
    target,
    targetResolved,
  ]);

  useEffect(() => {
    if (!collapsedWhenEmpty) return;
    const onOpen = (event: Event) => {
      if ((event as CustomEvent<string>).detail === threadKey) return;
      const hasDraft = [
        ...(shell.current?.querySelectorAll<HTMLTextAreaElement>("textarea") ??
          []),
      ].some(input => input.value.trim());
      if (!hasDraft) setExpanded(false);
    };
    window.addEventListener("comment-panel-open", onOpen);
    return () => window.removeEventListener("comment-panel-open", onOpen);
  }, [threadKey, collapsedWhenEmpty]);

  const toggle = () => {
    if (!expanded) {
      setActivated(true);
      window.dispatchEvent(
        new CustomEvent("comment-panel-open", { detail: threadKey })
      );
    }
    setExpanded(!expanded);
  };

  if (!commentsEnabled) {
    return null;
  }

  if (!hasRequiredEnv) {
    return (
      <div className="mt-6 rounded-xl border border-border/60 bg-muted/15 px-4 py-3 text-sm text-skin-base/80">
        评论功能已开启，但尚未完成 Twikoo 配置。请在环境变量中设置
        <code className="mx-1 rounded bg-muted/30 px-1.5 py-0.5 text-xs">
          PUBLIC_TWIKOO_ENV_ID
        </code>
        后重新部署。
      </div>
    );
  }

  const hasComments = commentCount !== null && commentCount > 0;
  return (
    <div
      className={
        collapsedWhenEmpty ? "notes-comments mt-3" : "comments-panel mt-8"
      }
    >
      {collapsedWhenEmpty && (
        <button
          type="button"
          className="ml-auto flex min-h-11 items-center gap-2 text-sm text-foreground/60 hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
          onClick={toggle}
          aria-expanded={expanded}
          aria-controls={`${threadKey}-panel`}
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path
              d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6 3V6a2 2 0 0 1 2-2Z"
              strokeLinejoin="round"
            />
          </svg>
          <span>
            {expanded ? "收起评论" : "评论"}
            {hasComments ? ` ${commentCount}` : ""}
          </span>
        </button>
      )}
      <div
        id={`${threadKey}-panel`}
        hidden={!expanded}
        className={
          collapsedWhenEmpty ? "border-t border-border/60 pt-3 pb-4" : ""
        }
      >
        {activated && status === "loading" && (
          <p
            className="py-4 text-center text-sm text-foreground/60"
            role="status"
          >
            正在加载评论…
          </p>
        )}
        {status === "error" && (
          <p className="py-4 text-sm text-foreground/60" role="alert">
            评论暂时无法加载，请稍后重新打开页面。
          </p>
        )}
        {locationMessage && (
          <p role="status" className="py-3 text-sm text-foreground/60">
            {locationMessage}
          </p>
        )}
        <div
          ref={shell}
          className="twikoo-root"
          data-compact-editor=""
          onFocusCapture={event => {
            const target = event.target as HTMLElement;
            if (target.matches("textarea"))
              target
                .closest(".tk-submit")
                ?.setAttribute("data-editor-expanded", "");
          }}
        />
      </div>
    </div>
  );
}
