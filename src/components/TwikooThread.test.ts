import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";

vi.mock("astro:env/client", () => ({
  PUBLIC_TWIKOO_ENV_ID: "test-env",
  PUBLIC_TWIKOO_REGION: "",
  PUBLIC_TWIKOO_LANG: "zh-CN",
}));
vi.mock("@/config", () => ({ SITE: { comments: { enabled: true } } }));
import TwikooThread from "./TwikooThread";

describe("shared comment presentation", () => {
  it("shows the page panel immediately without an inline toggle", () => {
    const $ = load(
      renderToStaticMarkup(
        createElement(TwikooThread, {
          threadKey: "page",
          path: "/about",
          mode: "page",
        })
      )
    );
    expect($("button")).toHaveLength(0);
    expect($("#page-panel").attr("hidden")).toBeUndefined();
    expect($("[role=status]").text()).toContain("正在加载评论");
  });

  it("keeps inline panels hidden and uninitialized until requested", () => {
    const $ = load(
      renderToStaticMarkup(
        createElement(TwikooThread, {
          threadKey: "day",
          path: "/diary/2026-08-05",
          mode: "inline",
        })
      )
    );
    expect($("button").attr("aria-expanded")).toBe("false");
    expect($("button").attr("aria-controls")).toBe("day-panel");
    expect($("#day-panel").attr("hidden")).toBeDefined();
    expect($("[role=status]")).toHaveLength(0);
    expect($(".twikoo-root").children()).toHaveLength(0);
  });
});
