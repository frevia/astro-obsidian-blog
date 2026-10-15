import { afterEach, describe, expect, it, vi } from "vitest";

function setup() {
  vi.resetModules();
  vi.useFakeTimers();
  vi.stubEnv("PUBLIC_AMAP_KEY", "test-key");
  vi.stubEnv("PUBLIC_AMAP_SERVICE_HOST", "https://example.com/_AMapService");
  vi.stubEnv("PUBLIC_AMAP_SECURITY_JS_CODE", "");
  const script = {
    src: "",
    async: false,
    onerror: null as (() => void) | null,
    remove: vi.fn(),
  };
  const append = vi.fn();
  vi.stubGlobal("window", {});
  vi.stubGlobal("document", { createElement: () => script, head: { append } });
  return { script, append };
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("AMap loader", () => {
  it("rejects missing configuration without fetching the SDK", async () => {
    const { append } = setup();
    vi.stubEnv("PUBLIC_AMAP_KEY", "");
    const { loadAMap } = await import("./amap");
    await expect(loadAMap()).rejects.toThrow("Missing AMap configuration");
    expect(append).not.toHaveBeenCalled();
  });
  it("shares loading across mounts and configures security before requesting the SDK", async () => {
    const { append, script } = setup();
    const { loadAMap } = await import("./amap");
    const first = loadAMap();
    expect(loadAMap()).toBe(first);
    expect(append).toHaveBeenCalledTimes(1);
    expect(window._AMapSecurityConfig).toEqual({
      serviceHost: "https://example.com/_AMapService",
    });
    expect(new URL(script.src).searchParams.get("plugin")).toBe("AMap.Scale");
    window.AMap = {} as NonNullable<Window["AMap"]>;
    window.__footprintAMapReady?.();
    await expect(first).resolves.toBe(window.AMap);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("times out, removes the failed script and permits a retry", async () => {
    const { script, append } = setup();
    const { loadAMap } = await import("./amap");
    const first = expect(loadAMap()).rejects.toThrow("AMap failed to load");
    await vi.advanceTimersByTimeAsync(15000);
    await first;
    expect(script.remove).toHaveBeenCalled();
    const retry = expect(loadAMap()).rejects.toThrow("AMap failed to load");
    expect(append).toHaveBeenCalledTimes(2);
    script.onerror?.();
    await retry;
  });
});
