import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

function setup(readyState = 0) {
  const source = readFileSync("public/app-controls.js", "utf8");
  const start = source.indexOf("  // ===== 视频控制功能 =====");
  const end = source.indexOf("  // 离开前记录当前页面", start);
  const handlers = new Map<string, () => void>();
  const classes = () => ({ add: vi.fn(), remove: vi.fn() });
  const button = {
    classList: classes(),
    setAttribute: vi.fn(),
    addEventListener: vi.fn(),
  };
  const container = {
    classList: { contains: () => true },
    querySelector: () => button,
  };
  const video = {
    nodeType: 1,
    tagName: "VIDEO",
    readyState,
    parentElement: container,
    classList: classes(),
    addEventListener: vi.fn(),
    load: vi.fn(),
  };
  let onMutation!: (mutations: unknown[]) => void;
  const document = {
    body: {},
    querySelectorAll: () => [video],
    addEventListener: (name: string, handler: () => void) =>
      handlers.set(name, handler),
  };
  runInNewContext(source.slice(start, end), {
    document,
    Node: { ELEMENT_NODE: 1 },
    MutationObserver: class {
      constructor(callback: typeof onMutation) {
        onMutation = callback;
      }
      observe() {}
    },
    initThemeControls: vi.fn(),
  });
  return { handlers, video, onMutation };
}

describe("video controls across client navigation", () => {
  it("restarts an unloaded video after a page swap, only once per element", () => {
    const { handlers, video, onMutation } = setup();
    handlers.get("astro:page-load")!();
    expect(video.load).toHaveBeenCalledOnce();
    const listenerCount = video.addEventListener.mock.calls.length;

    // Wrapping the video queues mutations; repeated page events must be safe too.
    onMutation([{ addedNodes: [video] }]);
    handlers.get("astro:page-load")!();
    expect(video.load).toHaveBeenCalledOnce();
    expect(video.addEventListener).toHaveBeenCalledTimes(listenerCount);
  });

  it("keeps already loaded media and its playback position intact", () => {
    const { handlers, video } = setup(4);
    handlers.get("astro:page-load")!();
    expect(video.load).not.toHaveBeenCalled();
    expect(video.addEventListener).toHaveBeenCalled();
  });
});
