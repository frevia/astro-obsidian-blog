import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { transpile } from "typescript";
import { describe, expect, it, vi } from "vitest";

function setup() {
  const source = readFileSync("src/components/Header.astro", "utf8");
  const close = source.slice(
    source.indexOf("  function closeDisclosures("),
    source.indexOf("  function toggleNav()")
  );
  const listeners = source.slice(
    source.indexOf('  document.addEventListener("click", event => {'),
    source.indexOf("  // Runs on view transitions navigation")
  );
  const groups = [0, 1].map(() => ({
    open: false,
    summary: { focus: vi.fn() },
    querySelector() {
      return this.summary;
    },
  }));
  class Target {
    constructor(private group?: (typeof groups)[number]) {}
    closest(selector: string) {
      return selector === "summary" ? this.group?.summary : this.group;
    }
  }
  const handlers = new Map<string, (event?: unknown) => void>();
  runInNewContext(transpile(close + listeners), {
    Element: Target,
    document: {
      querySelectorAll: () => groups.filter(group => group.open),
      querySelector: (selector: string) =>
        selector === ".nav-disclosure[open]"
          ? groups.find(group => group.open)
          : null,
      addEventListener: (name: string, handler: (event?: unknown) => void) =>
        handlers.set(name, handler),
    },
  });
  const clickSummary = (index: number) => {
    const group = groups[index];
    handlers.get("click")!({ target: new Target(group) });
    // Native summary activation toggles details after the bubbling click.
    group.open = !group.open;
  };
  return { groups, handlers, clickSummary, Target };
}

describe("header dropdown interactions", () => {
  it("closes the mobile menu when resizing into the desktop layout", () => {
    const source = readFileSync("src/components/Header.astro", "utf8");
    const resize = source.slice(
      source.indexOf('  window.addEventListener("resize",'),
      source.indexOf("</script>")
    );
    let desktop = false;
    let handler!: () => void;
    const click = vi.fn();
    const syncHeaderOffset = vi.fn();
    runInNewContext(transpile(resize), {
      window: {
        matchMedia: () => ({ matches: desktop }),
        addEventListener: (_name: string, fn: () => void) => (handler = fn),
      },
      document: { querySelector: () => ({ click }) },
      syncHeaderOffset,
    });
    handler();
    expect(click).not.toHaveBeenCalled();
    desktop = true;
    handler();
    expect(click).toHaveBeenCalledOnce();
    expect(syncHeaderOffset).toHaveBeenCalledTimes(2);
  });

  it("opens one group at a time and lets the active summary close itself", () => {
    const { groups, clickSummary } = setup();
    clickSummary(0);
    clickSummary(1);
    expect(groups.map(group => group.open)).toEqual([false, true]);
    clickSummary(1);
    expect(groups.every(group => !group.open)).toBe(true);
  });

  it("restores summary focus on Escape and closes on outside clicks and swaps", () => {
    const { groups, handlers, clickSummary, Target } = setup();
    const preventDefault = vi.fn();
    clickSummary(0);
    handlers.get("keydown")!({ key: "Escape", preventDefault });
    expect(groups[0].open).toBe(false);
    expect(groups[0].summary.focus).toHaveBeenCalledOnce();
    expect(preventDefault).toHaveBeenCalledOnce();
    clickSummary(1);
    handlers.get("click")!({ target: new Target() });
    expect(groups[1].open).toBe(false);
    clickSummary(0);
    handlers.get("astro:after-swap")!();
    expect(groups[0].open).toBe(false);
  });
});
