import { useEffect, useState } from "react";
import {
  PUBLIC_TWIKOO_ENV_ID,
  PUBLIC_TWIKOO_REGION,
  PUBLIC_TWIKOO_LANG,
} from "astro:env/client";
import { SITE } from "@/config";

type TwikooInitOptions = {
  envId: string;
  el: string;
  path: string;
  lang?: string;
  region?: string;
};

type TwikooGetCommentsCountOptions = {
  envId: string;
  urls: string[];
  region?: string;
  includeReply?: boolean;
};

type TwikooGlobal = {
  init: (options: TwikooInitOptions) => void;
  getCommentsCount: (
    options: TwikooGetCommentsCountOptions
  ) => Promise<Array<{ url: string; count: number }>>;
};

declare global {
  interface Window {
    twikoo?: TwikooGlobal;
    __twikooScriptPromise?: Promise<void>;
  }
}

const TWIKOO_CDN =
  "https://cdn.jsdelivr.net/npm/twikoo@1.7.3/dist/twikoo.min.js";
const TWIKOO_CSS = "https://cdn.jsdelivr.net/npm/twikoo@1.7.3/dist/twikoo.css";

function ensureTwikooScript() {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.twikoo) return Promise.resolve();
  if (window.__twikooScriptPromise) return window.__twikooScriptPromise;

  window.__twikooScriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = TWIKOO_CDN;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Twikoo script"));
    document.body.appendChild(script);
  });

  return window.__twikooScriptPromise;
}

function ensureTwikooStyle() {
  if (typeof document === "undefined") return;
  if (document.querySelector('link[data-twikoo-style="1"]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = TWIKOO_CSS;
  link.setAttribute("data-twikoo-style", "1");
  document.head.appendChild(link);
}

interface TwikooThreadProps {
  threadKey: string;
  path: string;
  /** diary 区使用折叠态：未展开时右下角显示「图标 + 评论」按钮，点击后展开完整评论区 */
  collapsedWhenEmpty?: boolean;
}

export default function TwikooThread({
  threadKey,
  path,
  collapsedWhenEmpty = false,
}: TwikooThreadProps) {
  const commentsEnabled = SITE.comments.enabled;
  const envId = PUBLIC_TWIKOO_ENV_ID?.trim();
  const hasRequiredEnv = Boolean(envId);
  const [expanded, setExpanded] = useState(!collapsedWhenEmpty);
  const [commentCount, setCommentCount] = useState<number | null>(null);

  // 获取评论数量
  useEffect(() => {
    if (!commentsEnabled || !hasRequiredEnv) return;
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
        // 有评论时默认展开（保持原有逻辑）
        if (count > 0 && !collapsedWhenEmpty) setExpanded(true);
      } catch {
        // 忽略错误，保持折叠
      }
    };

    checkCount();
  }, [path, collapsedWhenEmpty]);

  useEffect(() => {
    if (!commentsEnabled || !hasRequiredEnv) return;
    if (!expanded) return;
    const resolvedEnvId = envId;
    if (!resolvedEnvId) return;

    const init = async () => {
      try {
        ensureTwikooStyle();
        await ensureTwikooScript();
        if (!window.twikoo) return;
        const root = document.getElementById(threadKey);
        if (root) root.innerHTML = "";

        const options: TwikooInitOptions = {
          envId: resolvedEnvId,
          el: `#${threadKey}`,
          path,
          lang: PUBLIC_TWIKOO_LANG || "zh-CN",
        };

        if (
          PUBLIC_TWIKOO_REGION &&
          (PUBLIC_TWIKOO_REGION === "ap-shanghai" ||
            PUBLIC_TWIKOO_REGION === "ap-guangzhou")
        ) {
          options.region = PUBLIC_TWIKOO_REGION;
        }

        window.twikoo.init(options);
      } catch (error) {
        console.error("Failed to initialize Twikoo thread:", error);
      }
    };

    init();
  }, [threadKey, path, expanded]);

  if (!commentsEnabled) {
    return null;
  }

  if (!hasRequiredEnv) {
    return (
      <div className="text-skin-base/80 mt-6 rounded-xl border border-border/60 bg-muted/15 px-4 py-3 text-sm">
        评论功能已开启，但尚未完成 Twikoo 配置。请在环境变量中设置
        <code className="mx-1 rounded bg-muted/30 px-1.5 py-0.5 text-xs">
          PUBLIC_TWIKOO_ENV_ID
        </code>
        后重新部署。
      </div>
    );
  }

  // diary 区折叠态：右下角纯图标+文字，点击展开
  if (collapsedWhenEmpty && !expanded) {
    const hasComments = commentCount !== null && commentCount > 0;
    const ariaLabel = hasComments
      ? `展开评论区（${commentCount} 条评论）`
      : "展开评论区";

    return (
      <div className="twikoo-diary-collapsed flex justify-end">
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="twikoo-diary-trigger text-skin-base group relative inline-flex items-center gap-1.5 border-0 bg-transparent p-1.5 text-sm font-medium shadow-none transition-all hover:text-accent focus:outline-none focus-visible:underline focus-visible:underline-offset-4"
          aria-label={ariaLabel}
        >
          <svg
            className="h-5 w-5 shrink-0 text-accent transition-transform group-hover:scale-110"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            {/* 气泡外框 */}
            <path
              d="M4.5 6.5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-6l-2 3.5v-3.5H6.5a2 2 0 0 1-2-2v-7z"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinejoin="round"
            />

            {/* 中间三个点 */}
            <circle cx="9" cy="10.5" r="0.9" fill="currentColor" />
            <circle cx="12" cy="10.5" r="0.9" fill="currentColor" />
            <circle cx="15" cy="10.5" r="0.9" fill="currentColor" />
          </svg>

          {/* 评论数量徽章 */}
          {hasComments && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-accent px-1 text-xs font-medium text-white shadow-sm">
              {commentCount > 99 ? "99+" : commentCount}
            </span>
          )}

          {/* 评论文字 */}
          <span className="text-sm leading-none font-medium">评论</span>
        </button>
      </div>
    );
  }

  return (
    <div className="twikoo-container">
      {/* 展开后的评论区域 */}
      <div id={threadKey} className="twikoo mt-6" />

      {/* 展开后的折叠按钮 */}
      {collapsedWhenEmpty && expanded && (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="text-skin-base inline-flex items-center gap-2 border-0 bg-transparent p-1 text-sm font-medium shadow-none transition-colors hover:text-accent focus:outline-none focus-visible:underline focus-visible:underline-offset-4"
            aria-label="折叠评论区"
          >
            <span>收起评论</span>
            <svg
              className="h-4 w-4 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden
            >
              <path
                d="M6 15l6-6 6 6"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
