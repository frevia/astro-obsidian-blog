import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  formatCardPublishedDate,
  formatFeedUpdatedStatus,
} from "../../public/feeds.js";

describe("feeds page presentation", () => {
  it("turns the feed timestamp into a readable freshness status", () => {
    const now = new Date(2026, 8, 3, 12);

    expect(
      formatFeedUpdatedStatus("2026年09月03日 09:00:00", now)
    ).toMatchObject({ label: "今日同步", stale: false });
    expect(
      formatFeedUpdatedStatus("2026年08月24日 09:00:00", now)
    ).toMatchObject({ label: "10 天前同步", stale: false });
    expect(
      formatFeedUpdatedStatus("2026年04月21日 09:55:09", now)
    ).toMatchObject({ label: "4 个月前同步", stale: true });
  });

  it("shortens dates from the current year without losing older years", () => {
    const now = new Date(2026, 8, 3, 12);

    expect(formatCardPublishedDate("2026-04-17", undefined, now)).toBe("04.17");
    expect(formatCardPublishedDate("2025-04-17", undefined, now)).toBe(
      "2025.04.17"
    );
  });

  it("keeps the neighbor overview and latest-post card grid", () => {
    const page = readFileSync("src/pages/feeds/index.astro", "utf-8");

    expect(page).toContain('aria-label="邻居动态概览"');
    expect(page).toContain('id="feeds-latest"');
    expect(page).toContain("最近来信");
    expect(page).toContain("推荐新邻居");
    const client = readFileSync("public/feeds.js", "utf-8");
    expect(client).toContain("feeds-card-latest-label");
    expect(client).toContain("feeds-card-site-link");
    expect(client).toContain("feeds-card-article-link");
    expect(client).toContain("feeds-card-article-row");
    expect(client).toContain("item.site_link");
    expect(page).toMatch(
      /#main-content:has\(\.feeds-page-stage\)::before\s*\{[^}]*inset-inline:\s*0;/s
    );
    expect(page).toMatch(/\.feeds-comments\s*\{[^}]*overflow-x:\s*clip;/s);
    expect(page).toMatch(
      /\.feeds-list\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\);/s
    );
    expect(page).not.toMatch(/\.feeds-card\s*\{[^}]*box-shadow:/s);
  });
});
