import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

function setup() {
  const source = readFileSync("public/app-controls.js", "utf8");
  const start = source.indexOf("  let navigationId = 0;");
  const end = source.indexOf("  // ===== 主题切换功能 =====", start);
  const handlers = new Map<string, (event?: unknown) => void>();
  const dataset: Record<string, string> = {};
  const document = {
    documentElement: { dataset },
    addEventListener: (name: string, fn: (event?: unknown) => void) =>
      handlers.set(name, fn),
  };
  runInNewContext(source.slice(start, end), {
    document,
    window: { addEventListener: document.addEventListener },
  });
  return { handlers, dataset };
}

describe("navigation preparation feedback", () => {
  it("does not let an earlier navigation clear a newer pending navigation", async () => {
    const { handlers, dataset } = setup();
    let completeFirst!: () => void;
    let completeSecond!: () => void;
    const first = {
      loader: () =>
        new Promise<void>(resolve => {
          completeFirst = resolve;
        }),
    };
    const second = {
      loader: () =>
        new Promise<void>(resolve => {
          completeSecond = resolve;
        }),
    };
    handlers.get("astro:before-preparation")!(first);
    const firstLoad = first.loader();
    handlers.get("astro:before-preparation")!(second);
    const secondLoad = second.loader();
    completeFirst();
    await firstLoad;
    expect(dataset.navigationPending).toBe("");
    completeSecond();
    await secondLoad;
    expect(dataset.navigationPending).toBeUndefined();
  });
  it("clears on failure and on history restoration", async () => {
    const { handlers, dataset } = setup();
    const event = {
      loader: async () => {
        throw new Error("network");
      },
    };
    handlers.get("astro:before-preparation")!(event);
    await expect(event.loader()).rejects.toThrow("network");
    expect(dataset.navigationPending).toBeUndefined();
    dataset.navigationPending = "";
    handlers.get("pageshow")!();
    expect(dataset.navigationPending).toBeUndefined();
  });
});
