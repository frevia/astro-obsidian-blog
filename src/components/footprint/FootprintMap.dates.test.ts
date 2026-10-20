import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import { expect, it } from "vitest";
import FootprintMap from "../FootprintMap";

it("labels the latest publication using its article timezone, independent of the event year", () => {
  const $ = load(
    renderToStaticMarkup(
      React.createElement(FootprintMap, {
        places: [],
        records: [
          {
            title: "回顾",
            url: "/posts/retrospective",
            name: "杭州",
            lng: 120,
            lat: 30,
            date: "2026-04-01T01:00:00Z",
            timezone: "America/Los_Angeles",
            eventDate: "2024",
          },
        ],
      })
    )
  );
  expect($(".footprint-stats dt").last().text()).toContain("最近发表");
  expect($(".footprint-stat-date").text()).toBe("2026年3月31日");
});
