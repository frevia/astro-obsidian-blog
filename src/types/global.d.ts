// custom global declarations

export {};

declare global {
  interface Window {
    tocbot?: unknown;
    setupLazyList?: unknown;
    __artalkConfig?: { server?: string; site?: string };
  }
}
