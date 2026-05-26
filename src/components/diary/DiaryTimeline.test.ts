import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import DiaryTimeline from "../DiaryTimeline";

const mockedDiaryFeedList = vi.fn((props: unknown) =>
  React.createElement("div", null, `mock-diary-feed-list-${JSON.stringify(props)}`)
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
});
