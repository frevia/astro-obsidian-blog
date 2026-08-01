import { describe, expect, it } from "vitest";
import { calcPagination, nextPageState } from "./pagination";

describe("calcPagination", () => {
  it("returns single page for empty list", () => {
    expect(calcPagination(0, 5)).toEqual({
      currentPage: 1,
      totalPages: 1,
      hasMore: false,
      itemsPerPage: 5,
    });
  });

  it("computes total pages and hasMore", () => {
    expect(calcPagination(12, 5)).toEqual({
      currentPage: 1,
      totalPages: 3,
      hasMore: true,
      itemsPerPage: 5,
    });
  });
});

describe("nextPageState", () => {
  it("turns hasMore false at last page", () => {
    expect(
      nextPageState(
        { currentPage: 2, totalPages: 3, hasMore: true, itemsPerPage: 5 },
        3
      )
    ).toEqual({
      currentPage: 3,
      totalPages: 3,
      hasMore: false,
      itemsPerPage: 5,
    });
  });
});
