// custom global declarations

export {};

declare global {
  interface Window {
    tocbot?: any;
    setupLazyList?: any;
    __artalkConfig?: { server?: string; site?: string };
  }
}
