import { describe, expect, it } from "vitest";
import { groupNearbyPlaces } from "./photoClusters";
describe("photo marker overlap", () => {
  it("merges overlapping places including chains without losing or duplicating them", () => {
    expect(
      groupNearbyPlaces([
        { item: "a", x: 0, y: 0 },
        { item: "b", x: 60, y: 0 },
        { item: "c", x: 120, y: 0 },
        { item: "d", x: 300, y: 0 },
      ])
    ).toEqual([["a", "b", "c"], ["d"]]);
  });
  it("separates places when projected farther apart after zooming", () => {
    expect(
      groupNearbyPlaces([
        { item: "a", x: 0, y: 0 },
        { item: "b", x: 100, y: 0 },
      ])
    ).toEqual([["a"], ["b"]]);
    expect(groupNearbyPlaces([])).toEqual([]);
  });
});
