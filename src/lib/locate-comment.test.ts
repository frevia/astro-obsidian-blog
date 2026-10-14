import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { locateComment } from "./locate-comment";

describe("comment location lifecycle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("window", { setInterval });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
  it("waits for asynchronous rendering, then focuses and highlights the exact reply", () => {
    const target = {
      id: "reply",
      parentElement: null,
      querySelector: vi.fn(),
      setAttribute: vi.fn(),
      focus: vi.fn(),
      scrollIntoView: vi.fn(),
    };
    let rendered = false;
    const host = {
      querySelectorAll: vi.fn((selector: string) =>
        selector === ".tk-comment" && rendered ? [target] : []
      ),
      querySelector: vi.fn(),
    };
    const report = vi.fn();
    locateComment(host as unknown as HTMLElement, "reply", report);
    vi.advanceTimersByTime(500);
    expect(target.focus).not.toHaveBeenCalled();
    rendered = true;
    vi.advanceTimersByTime(250);
    expect(target.setAttribute).toHaveBeenCalledWith("data-comment-target", "");
    expect(target.focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(report).toHaveBeenLastCalledWith("");
    expect(vi.getTimerCount()).toBe(0);
  });
  it("does not repeatedly click load more while the same page is pending", () => {
    const more = { click: vi.fn() };
    const host = { querySelectorAll: () => [], querySelector: () => more };
    const report = vi.fn();
    locateComment(host as unknown as HTMLElement, "missing", report);
    vi.advanceTimersByTime(10000);
    expect(more.click).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(11000);
    expect(report.mock.lastCall?.[0]).toContain("暂未找到");
    expect(vi.getTimerCount()).toBe(0);
  });
  it("cancels pending work when the component unmounts", () => {
    const host = { querySelectorAll: vi.fn(() => []), querySelector: vi.fn() };
    const stop = locateComment(
      host as unknown as HTMLElement,
      "missing",
      vi.fn()
    );
    stop();
    vi.advanceTimersByTime(30000);
    expect(host.querySelectorAll).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
