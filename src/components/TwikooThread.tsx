import React, { useEffect, useState } from "react";
import {
  PUBLIC_TWIKOO_ENABLED,
  PUBLIC_TWIKOO_ENV_ID,
  PUBLIC_TWIKOO_REGION,
  PUBLIC_TWIKOO_LANG,
} from "astro:env/client";

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
const DEFAULT_AVATAR = "/favicon.png";
const TWIKOO_AVATAR_CACHE_KEY = "twikoo_avatar_url";
const TWIKOO_PROFILE_KEY = "twikoo";

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

function readCachedAvatar(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const direct = localStorage.getItem(TWIKOO_AVATAR_CACHE_KEY);
    if (direct) return direct;

    const raw = localStorage.getItem(TWIKOO_PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { avatar?: string };
    return parsed.avatar || null;
  } catch {
    return null;
  }
}

async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

async function resolveAvatarFromTwikooStorage(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(TWIKOO_PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      avatar?: string;
      mail?: string;
      nick?: string;
    };

    if (parsed.avatar) return parsed.avatar;
    if (!parsed.mail) return null;

    const hash = await sha256Hex(parsed.mail.trim().toLowerCase());
    const params = new URLSearchParams({ d: "initials" });
    if (parsed.nick) params.set("name", parsed.nick);
    return `https://weavatar.com/avatar/${hash}?${params.toString()}`;
  } catch {
    return null;
  }
}

function cacheAvatar(avatarUrl: string) {
  if (typeof window === "undefined" || !avatarUrl) return;
  try {
    localStorage.setItem(TWIKOO_AVATAR_CACHE_KEY, avatarUrl);

    // 同步写入 twikoo 键，便于统一从一个对象读取
    const raw = localStorage.getItem(TWIKOO_PROFILE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, string>;
    parsed.avatar = avatarUrl;
    localStorage.setItem(TWIKOO_PROFILE_KEY, JSON.stringify(parsed));
  } catch {
    // 忽略缓存写入失败
  }
}

interface TwikooThreadProps {
  threadKey: string;
  path: string;
  /** diary 区使用折叠态：未展开时显示「说点什么吧...」横条，点击后展开完整评论区 */
  collapsedWhenEmpty?: boolean;
}

export default function TwikooThread({
  threadKey,
  path,
  collapsedWhenEmpty = false,
}: TwikooThreadProps) {
  const [expanded, setExpanded] = useState(!collapsedWhenEmpty);
  const [avatarSrc, setAvatarSrc] = useState(DEFAULT_AVATAR);

  useEffect(() => {
    const hydrateAvatar = async () => {
      const directCached = readCachedAvatar();
      if (directCached) {
        setAvatarSrc(directCached);
        return;
      }

      const fromProfile = await resolveAvatarFromTwikooStorage();
      if (fromProfile) {
        setAvatarSrc(fromProfile);
        cacheAvatar(fromProfile);
      }
    };

    hydrateAvatar();
  }, []);

  // 有评论时默认展开：调用 getCommentsCount（无需先 init）
  useEffect(() => {
    if (
      PUBLIC_TWIKOO_ENABLED !== "true" ||
      !PUBLIC_TWIKOO_ENV_ID ||
      !collapsedWhenEmpty
    )
      return;

    const checkCount = async () => {
      try {
        ensureTwikooStyle();
        await ensureTwikooScript();
        if (!window.twikoo?.getCommentsCount) return;
        const opts: TwikooGetCommentsCountOptions = {
          envId: PUBLIC_TWIKOO_ENV_ID,
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
        if (count > 0) setExpanded(true);
      } catch {
        // 忽略错误，保持折叠
      }
    };

    checkCount();
  }, [path, collapsedWhenEmpty]);

  useEffect(() => {
    if (PUBLIC_TWIKOO_ENABLED !== "true" || !PUBLIC_TWIKOO_ENV_ID) return;
    if (!expanded) return;

    const init = async () => {
      try {
        ensureTwikooStyle();
        await ensureTwikooScript();
        if (!window.twikoo) return;
        const root = document.getElementById(threadKey);
        if (root) root.innerHTML = "";

        const options: TwikooInitOptions = {
          envId: PUBLIC_TWIKOO_ENV_ID,
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

  useEffect(() => {
    if (!expanded) return;
    if (typeof window === "undefined") return;

    const root = document.getElementById(threadKey);
    if (!root) return;

    const syncAvatar = async () => {
      const avatarImg =
        root.querySelector<HTMLImageElement>(".tk-submit .tk-avatar img") ||
        root.querySelector<HTMLImageElement>(".tk-avatar img");
      const src = avatarImg?.getAttribute("src");
      if (src) {
        setAvatarSrc(src);
        cacheAvatar(src);
        return;
      }

      // 当 DOM 里还没头像元素时，尝试从 twikoo 的 nick/mail 计算头像
      const fromProfile = await resolveAvatarFromTwikooStorage();
      if (!fromProfile) return;
      setAvatarSrc(fromProfile);
      cacheAvatar(fromProfile);
    };

    // 首次尝试 + 异步渲染兜底
    syncAvatar();
    const timer = window.setTimeout(syncAvatar, 600);

    // 监听评论区变化（邮箱变更、Twikoo 重渲染等）
    const observer = new MutationObserver(syncAvatar);
    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src"],
    });

    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [expanded, threadKey]);

  if (PUBLIC_TWIKOO_ENABLED !== "true" || !PUBLIC_TWIKOO_ENV_ID) {
    return null;
  }

  // diary 区折叠态：头像与输入框分开显示，点击框展开
  if (collapsedWhenEmpty && !expanded) {
    return (
      <div className="twikoo-diary-collapsed mt-6 flex items-center gap-3">
        <span
          className="twikoo-diary-avatar flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted/50"
          aria-hidden
        >
          <img
            src={avatarSrc}
            alt=""
            className="h-full w-full object-cover"
          />
        </span>
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="twikoo-diary-trigger min-w-0 flex-1 rounded-xl border border-border/60 bg-muted/20 py-2.5 px-4 text-left transition-colors hover:border-border hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-accent/40"
          aria-label="展开评论区，说点什么吧"
        >
          <span className="text-skin-base/60 text-sm">说点什么吧...</span>
        </button>
      </div>
    );
  }

  return <div id={threadKey} className="twikoo mt-6" />;
}
