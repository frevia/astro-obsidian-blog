import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Calendar from "./Calendar";
import FootprintMap, { wheelZoomDelta } from "./FootprintMap";

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
    expect(html).toContain("当天有 2 条 Notes 或文章可回看。");
    expect(html).toContain("2024年2月29日");
  });

  it("renders a map without a side rail even when a place has no articles", () => {
    const html = renderToStaticMarkup(
      React.createElement(FootprintMap, {
        places: [
          { name: "杭州", lat: 30.25, lng: 120.15 },
          { name: "上海", lat: 31.23, lng: 121.47 },
        ],
        records: [],
      })
    );
    expect(html).toContain("交互式足迹地图");
    expect(html).toContain("适配全部地点");
    expect(html).not.toContain("<aside");
    expect(html).not.toContain("footprint-place-rail");
  });

  it("keeps a cover-style empty state before any footprint location exists", () => {
    const source = readFileSync(
      resolve(import.meta.dirname, "FootprintMap.tsx"),
      "utf-8"
    );

    expect(source).toContain("data-footprint-empty-state");
    expect(source).toContain("这里还没有地点");
    expect(source).toContain("正在准备地图图层");
    expect(source).toContain("交互式足迹地图");
    expect(source).not.toContain("data-footprint-place-rail");
  });

  it("keeps photo panel navigation and map failure links", () => {
    const source = readFileSync(
      resolve(import.meta.dirname, "FootprintMap.tsx"),
      "utf-8"
    );

    expect(source).toContain('aria-label="足迹文章"');
    const panel = readFileSync(
      resolve(import.meta.dirname, "footprint/FootprintPhotoPanel.tsx"),
      "utf-8"
    );
    expect(panel).toContain("posts.map");
    expect(panel).toContain("data-photo-source");
    expect(panel).toContain("initArticleLightbox");
    expect(source).not.toContain("item.posts.slice");

    expect(source).toContain('button.type = "button"');
    expect(source).toContain("<FootprintPhotoPanel");
    expect(source).toContain("footprint-marker-pin-base");
    expect(source).toContain("footprint-marker-pin-hole");
    expect(source).toContain('data-astro-prefetch="tap"');
    expect(panel).toContain('data-astro-prefetch="tap"');
    expect(source).toContain("loadAMap()");
    expect(source).toContain("地图暂时无法加载");
  });
});

describe("map wheel normalization", () => {
  it("supports mouse and fractional trackpad deltas in both directions", () => {
    expect(wheelZoomDelta({ deltaY: -100, deltaMode: 0, ctrlKey: false })).toBe(
      0.5
    );
    expect(wheelZoomDelta({ deltaY: 2, deltaMode: 0, ctrlKey: false })).toBe(
      -0.01
    );
    expect(wheelZoomDelta({ deltaY: -2, deltaMode: 0, ctrlKey: true })).toBe(
      0.05
    );
    expect(wheelZoomDelta({ deltaY: 3, deltaMode: 1, ctrlKey: false })).toBe(
      -0.24
    );
  });
  it("caps page jumps and ignores zero or invalid input", () => {
    expect(wheelZoomDelta({ deltaY: 1, deltaMode: 2, ctrlKey: false })).toBe(
      -1
    );
    expect(
      wheelZoomDelta({ deltaY: -10000, deltaMode: 0, ctrlKey: false })
    ).toBe(1);
    expect(
      Math.abs(wheelZoomDelta({ deltaY: 0, deltaMode: 0, ctrlKey: false }))
    ).toBe(0);
    expect(wheelZoomDelta({ deltaY: NaN, deltaMode: 0, ctrlKey: false })).toBe(
      0
    );
  });
});
