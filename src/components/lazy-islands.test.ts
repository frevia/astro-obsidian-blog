import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import Calendar from "./Calendar";

describe("lazy island SSR contracts", () => {
  it("renders Calendar from the server-provided initial date", () => {
    const html = renderToStaticMarkup(
      React.createElement(Calendar, {
        eventsByDate: {},
        initialDateKey: "2024-02-29",
      })
    );

    expect(html).toContain("2024年2月");
    expect(html).toContain('aria-label="2024-02-29');
    expect(html).toContain("2024年2月29日");
    expect(html).toContain("该日暂无碎片或文章");
  });

  it("produces the same initial Calendar markup on the server and client", () => {
    const props = {
      eventsByDate: {},
      initialDateKey: "2024-02-29",
    };

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-02-29T12:00:00Z"));
    const serverHtml = renderToStaticMarkup(
      React.createElement(Calendar, props)
    );
    vi.stubGlobal("window", {});
    try {
      vi.setSystemTime(new Date("2024-03-02T12:00:00Z"));
      const clientHtml = renderToStaticMarkup(
        React.createElement(Calendar, props)
      );
      expect(clientHtml).toBe(serverHtml);
    } finally {
      vi.unstubAllGlobals();
      vi.useRealTimers();
    }
  });

  it("server-renders Calendar and hydrates it only when visible", () => {
    const source = readFileSync(
      resolve(import.meta.dirname, "CalendarWidget.astro"),
      "utf-8"
    );

    expect(source).toContain("client:visible");
    expect(source).toContain("const initialDateKey = toSiteYMD(new Date());");
    expect(source).toContain("initialDateKey={initialDateKey}");
    expect(source).not.toContain("client:only");
  });

  it("keeps the empty footprint map stable and accessible before visible hydration", () => {
    const pageSource = readFileSync(
      resolve(import.meta.dirname, "../pages/footprint.astro"),
      "utf-8"
    );
    const mapSource = readFileSync(
      resolve(import.meta.dirname, "FootprintMap.tsx"),
      "utf-8"
    );

    expect(pageSource).toContain("client:visible");
    expect(pageSource).not.toContain("client:load");
    expect(mapSource).toContain("places = []");
    expect(mapSource).toContain("records = []");
    expect(mapSource).toContain('className="footprint-leaflet-map"');
    expect(mapSource).toContain('aria-label="交互式足迹地图"');
    expect(mapSource).toContain("data-footprint-place-rail");
    expect(mapSource).toContain("正在准备地图图层");
  });

  it("keeps diary entries static and hydrates only the pagination island", () => {
    const homeSource = readFileSync(
      resolve(import.meta.dirname, "../pages/index.astro"),
      "utf-8"
    );
    const diarySource = readFileSync(
      resolve(import.meta.dirname, "../pages/diary/[...page].astro"),
      "utf-8"
    );

    expect(homeSource).toContain("<DiaryFeed");
    expect(homeSource).toContain("<DiaryLoadMore");
    expect(homeSource).toContain('client:visible={{ rootMargin: "800px" }}');
    expect(homeSource).not.toContain("<DiaryTimeline");
    expect(diarySource).toContain("<DiaryFeed");
    expect(diarySource).not.toMatch(/client:(?:load|idle|visible|media|only)/);
    expect(diarySource).not.toContain("<DiaryTimeline");
    expect(diarySource).not.toContain("<DiaryLoadMore");
    expect(homeSource).not.toContain("client:load");
    expect(diarySource).not.toContain("client:load");
  });
});
