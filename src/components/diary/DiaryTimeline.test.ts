import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import DiaryTimeline from "../DiaryTimeline";

const mockedDiaryFeedList = vi.fn((props: unknown) =>
  React.createElement(
    "div",
    null,
    `mock-diary-feed-list-${JSON.stringify(props)}`
  )
);

vi.mock("../DiaryEntryReact", () => ({
  default: () => React.createElement("div", null, "mock-diary-entry"),
}));

vi.mock("./DiaryFeedList", () => ({
  default: (props: unknown) => mockedDiaryFeedList(props),
}));

vi.mock("./DiaryLoadState", () => ({
  default: () => React.createElement("div", null, "mock-diary-load-state"),
}));

describe("DiaryTimeline states", () => {
  it("shows empty state when entries empty", () => {
    const html = renderToStaticMarkup(
      React.createElement(DiaryTimeline, {
        initialEntries: [],
        paginationInfo: {
          currentPage: 1,
          totalPages: 1,
          hasMore: false,
          itemsPerPage: 5,
        },
      })
    );

    expect(html).toContain("mock-diary-feed-list");
  });

  it("passes density mode to diary feed list", () => {
    mockedDiaryFeedList.mockClear();

    renderToStaticMarkup(
      React.createElement(DiaryTimeline, {
        initialEntries: [],
        paginationInfo: {
          currentPage: 1,
          totalPages: 1,
          hasMore: false,
          itemsPerPage: 5,
        },
        density: "compact",
      })
    );

    expect(mockedDiaryFeedList).toHaveBeenCalled();
    const firstCallProps = mockedDiaryFeedList.mock.calls.at(0)?.[0];
    expect(firstCallProps).toMatchObject({
      density: "compact",
    });
  });

  it("uses card-unique star clipPath ids in media card template", () => {
    const mediaCardSource = readFileSync(
      resolve(import.meta.dirname, "../MediaCard.tsx"),
      "utf-8"
    );

    expect(mediaCardSource).toContain("half-star-${id ?? title}-${star}");
    expect(mediaCardSource).toContain("clipPath={`url(#${starClipId})`}");
  });
});
