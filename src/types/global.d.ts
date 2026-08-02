// custom global declarations

export {};

declare global {
  interface Window {
    setupLazyList?: unknown;
    __artalkConfig?: { server?: string; site?: string };
  }
}
