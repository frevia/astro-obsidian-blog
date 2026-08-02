import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Calendar from "./Calendar";

describe("calendar and footprint visual integration", () => {
  it("renders the compact calendar entry as a today panel with day context", () => {
    const html = renderToStaticMarkup(
      React.createElement(Calendar, {
        compact: true,
        initialDateKey: "2024-02-29",
        eventsByDate: {
          "2024-02-29": [
            { type: "diary", url: "/diary/2024-02-29" },
            { type: "blog", url: "/blog/leap-day", title: "闰日记录" },
          ],
        },
      })
    );

    expect(html).toContain("data-calendar-today-panel");
    expect(html).toContain("今天");
    expect(html).toContain("29");
    expect(html).toContain("当天有 2 条碎片或文章可回看。");
    expect(html).toContain("2024年2月29日");
  });

  it("keeps a cover-style empty state before any footprint location exists", () => {
    const source = readFileSync(
      resolve(import.meta.dirname, "FootprintMap.tsx"),
      "utf-8"
    );

    expect(source).toContain("data-footprint-empty-state");
    expect(source).toContain("下一段旅程会从第一枚地点标记开始");
    expect(source).toContain("正在准备地图图层");
    expect(source).toContain("交互式足迹地图");
    expect(source).toContain("data-footprint-place-rail");
  });

  it("keeps map markers and the place list wired through accessible controls", () => {
    const source = readFileSync(
      resolve(import.meta.dirname, "FootprintMap.tsx"),
      "utf-8"
    );

    expect(source).toContain('aria-label="足迹地点与文章"');
    expect(source).toContain('id="footprint-place-list"');
    expect(source).toContain('aria-label="地点列表"');
    expect(source).toContain("aria-pressed={selectedKey === item.key}");
    expect(source).toContain("onClick={() => selectPlace(item.key)}");
    expect(source).toContain("marker.openPopup()");
  });
});
