import { useEffect, useRef, useState } from "react";
import {
  PUBLIC_TWIKOO_ENV_ID,
  PUBLIC_TWIKOO_REGION,
  PUBLIC_TWIKOO_LANG,
} from "astro:env/client";
import CommentIcon from "./CommentIcon";
import { SITE } from "@/config";

import {
  ensureTwikooScript,
  ensureTwikooStyle,
  type TwikooGetCommentsCountOptions,
} from "@/lib/twikoo-client";
import {
  commentNotificationHref,
  readCommentTarget,
} from "@/lib/comment-links";
import { locateComment } from "@/lib/locate-comment";

// Twikoo 2.x owns one app; serialize mounts across inline threads.
let initialization = Promise.resolve();

interface TwikooThreadProps {
  threadKey: string;
  path: string;
  /** Inline composers stay visible; their reply lists open on demand. */
  mode?: "page" | "inline";
  timestamp?: string;
}

export default function TwikooThread({
  threadKey,
  path,
  mode = "page",
  timestamp,
}: TwikooThreadProps) {
  const collapsedWhenEmpty = mode === "inline";
  const commentsEnabled = SITE.comments.enabled;
  const envId = PUBLIC_TWIKOO_ENV_ID?.trim();
  const hasRequiredEnv = Boolean(envId);
  const [expanded, setExpanded] = useState(!collapsedWhenEmpty);
  const shell = useRef<HTMLDivElement>(null);
  const [activated, setActivated] = useState(!collapsedWhenEmpty);
  const draft = useRef("");
  const focusComposer = useRef(false);
  const [canCollapseEditor, setCanCollapseEditor] = useState(false);
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
        window.dispatchEvent(
          new CustomEvent("comment-panel-open", { detail: threadKey })
        );
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
    // Twikoo can replace textareas after loading comments or opening a reply.
    const labelInputs = () => {
      // shortcut: Twikoo 2.0.16 exposes only SVG paths; replace when upstream provides action labels.
      const actionIcons = [
        ["M171.5 38.8", "点赞"],
        ["m360 32", "点踩"],
        ["M51.9 384.9", "回复"],
      ];
      host
        .querySelectorAll<HTMLButtonElement>(".tk-comment .tk-action-link")
        .forEach(button => {
          const path = button
            .querySelector(".tk-action-icon svg path")
            ?.getAttribute("d");
          const label = actionIcons.find(([prefix]) =>
            path?.startsWith(prefix)
          )?.[1];
          if (label && button.getAttribute("aria-label") !== label) {
            button.setAttribute("aria-label", label);
            button.setAttribute("title", label);
          }
        });
      host.querySelectorAll("textarea").forEach(input => {
        if (input.getAttribute("aria-label") !== "评论内容")
          input.setAttribute("aria-label", "评论内容");
      });
    };
    const inputObserver = new MutationObserver(labelInputs);
    inputObserver.observe(host, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["aria-label"],
    });
    const init = async () => {
      if (cancelled) return;
      setStatus("loading");
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
          href: commentNotificationHref(target?.path ?? path, location.origin),
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
              input.value = draft.current;
              input.dispatchEvent(new Event("input", { bubbles: true }));
              if (sharedDraft !== null)
                localStorage.setItem("twikoo-draft", sharedDraft);
            }
            if (
              collapsedWhenEmpty &&
              draft.current &&
              input.value !== draft.current
            ) {
              input.value = draft.current;
              input.dispatchEvent(new Event("input", { bubbles: true }));
            }
            if (!input.placeholder) input.placeholder = "说点什么吧…";
            input.setAttribute("aria-label", "评论内容");
            if (input.value)
              input
                .closest(".tk-submit")
                ?.setAttribute("data-editor-expanded", "");
          });
        setStatus("ready");
        if (focusComposer.current) {
          host.querySelector<HTMLTextAreaElement>("textarea")?.focus();
          focusComposer.current = false;
        }
        if (target)
          stopLocating = locateComment(host, target.id, setLocationMessage);
      } catch {
        if (!cancelled) setStatus("error");
      }
    };
    initialization = initialization.then(init, init);
    return () => {
      cancelled = true;
      stopLocating?.();
      inputObserver.disconnect();
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
      const input =
        shell.current?.querySelector<HTMLTextAreaElement>("textarea");
      if (input) draft.current = input.value;
      setExpanded(false);
      setActivated(false);
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
    if (expanded) {
      shell.current
        ?.querySelectorAll<HTMLElement>(".tk-submit")
        .forEach(editor => {
          if (
            !editor.querySelector<HTMLTextAreaElement>("textarea")?.value.trim()
          )
            editor.removeAttribute("data-editor-expanded");
        });
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
        collapsedWhenEmpty ? "notes-comments mt-1" : "comments-panel mt-8"
      }
    >
      {collapsedWhenEmpty && (
        <div className="notes-comment-toolbar">
          <span className="text-sm text-skin-base/60">{timestamp}</span>
          <button
            type="button"
            className="flex min-h-7 items-center gap-1 text-sm text-foreground/60 hover:text-accent focus-visible:outline-2 focus-visible:outline-accent pointer-coarse:min-h-11"
            onClick={toggle}
            aria-label={expanded ? "收起评论" : "展开评论"}
            aria-expanded={expanded}
            aria-controls={`${threadKey}-panel`}
          >
            <CommentIcon className="h-5 w-5" />
            <span>
              {expanded ? "收起" : "评论"}
              {hasComments ? ` ${commentCount}` : ""}
            </span>
          </button>
        </div>
      )}
      <div
        id={`${threadKey}-panel`}
        hidden={!collapsedWhenEmpty && !expanded}
        data-comments-expanded={expanded}
        className={collapsedWhenEmpty ? "notes-comment-panel" : ""}
      >
        {collapsedWhenEmpty && !activated && (
          <button
            type="button"
            className="notes-composer-trigger"
            onClick={() => {
              focusComposer.current = true;
              toggle();
            }}
            aria-label="说点什么吧…"
          >
            <span className="notes-composer-avatar" aria-hidden="true">
              <CommentIcon />
            </span>
            <span className="notes-composer-placeholder">
              {draft.current || "说点什么吧…"}
            </span>
          </button>
        )}
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
        {!collapsedWhenEmpty && canCollapseEditor && (
          <button
            type="button"
            className="comment-editor-close"
            onClick={() => {
              const editor = shell.current?.querySelector<HTMLElement>(
                ".tk-comments > .tk-submit"
              );
              const input =
                editor?.querySelector<HTMLTextAreaElement>("textarea");
              if (input?.value.trim()) return;
              input?.blur();
              editor?.removeAttribute("data-editor-expanded");
              setCanCollapseEditor(false);
            }}
          >
            收起输入框
          </button>
        )}
        <div
          ref={shell}
          className="twikoo-root"
          data-comment-mode={mode}
          data-compact-editor=""
          onInputCapture={event => {
            const input = event.target as HTMLTextAreaElement;
            if (input.matches("textarea")) {
              draft.current = input.value;
              if (
                input
                  .closest(".tk-submit")
                  ?.parentElement?.classList.contains("tk-comments")
              )
                setCanCollapseEditor(!input.value.trim());
            }
          }}
          onFocusCapture={event => {
            const target = event.target as HTMLElement;
            if (target.matches("textarea")) {
              if (
                target
                  .closest(".tk-submit")
                  ?.parentElement?.classList.contains("tk-comments")
              )
                setCanCollapseEditor(
                  !(target as HTMLTextAreaElement).value.trim()
                );
              if (collapsedWhenEmpty) setExpanded(true);
              target
                .closest(".tk-submit")
                ?.setAttribute("data-editor-expanded", "");
            }
          }}
        />
      </div>
    </div>
  );
}
