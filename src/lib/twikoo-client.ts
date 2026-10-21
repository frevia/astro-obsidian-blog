type TwikooInitOptions = {
  envId: string;
  el: string;
  path: string;
  lang?: string;
  region?: string;
  onCommentLoaded?: () => void;
};

export type TwikooGetCommentsCountOptions = {
  envId: string;
  urls: string[];
  region?: string;
  includeReply?: boolean;
};

export interface RecentComment {
  id: string;
  url: string;
  nick: string;
  commentText: string;
  created: number;
}

type TwikooGlobal = {
  getRecentComments: (options: {
    envId: string;
    region?: string;
    pageSize: number;
    includeReply: boolean;
  }) => Promise<RecentComment[]>;
  init: (options: TwikooInitOptions) => void | Promise<void>;
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
  "https://cdn.jsdelivr.net/npm/twikoo@2.0.16/dist/twikoo.min.js";
const TWIKOO_CSS = "https://cdn.jsdelivr.net/npm/twikoo@2.0.16/dist/twikoo.css";

export function ensureTwikooScript() {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.twikoo) return Promise.resolve();
  if (window.__twikooScriptPromise) return window.__twikooScriptPromise;

  window.__twikooScriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = TWIKOO_CDN;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      window.__twikooScriptPromise = undefined;
      script.remove();
      reject(new Error("Failed to load Twikoo script"));
    };
    document.body.appendChild(script);
  });

  return window.__twikooScriptPromise;
}

export function ensureTwikooStyle() {
  if (typeof document === "undefined") return;
  if (document.querySelector('link[data-twikoo-style="1"]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = TWIKOO_CSS;
  link.setAttribute("data-twikoo-style", "1");
  document.head.appendChild(link);
}
