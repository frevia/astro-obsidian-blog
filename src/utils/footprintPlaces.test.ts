import { describe, expect, it } from "vitest";
import {
  parseLocationText,
  toPlaceRecords,
  footprintPlaceUrl,
  findLinkedPlace,
} from "./footprintPlaces";

describe("footprint locations shared by home and map", () => {
  it("preserves place names and longitude/latitude order", () => {
    expect(parseLocationText(" 杭州, 运河, 120.1543, 30.2856 ")).toEqual({
      name: "杭州,运河",
      lng: 120.1543,
      lat: 30.2856,
    });
  });

  it("excludes incomplete, non-finite and out-of-range coordinates", () => {
    for (const value of [
      "杭州",
      "杭州,,30",
      ",120,30",
      "杭州,NaN,30",
      "杭州,181,30",
      "杭州,120,-91",
    ]) {
      expect(parseLocationText(value)).toBeNull();
    }
    expect(toPlaceRecords({ data: {} })).toEqual([]);
    expect(
      toPlaceRecords({ data: { locations: ["错误", "原点,0,0"] } })
    ).toEqual([{ name: "原点", lng: 0, lat: 0 }]);
  });
});

describe("article to map links", () => {
  const places = [
    { name: "河边 & 老街", lng: 120, lat: 30 },
    { name: "河边 & 老街", lng: 121, lat: 31 },
  ];
  it("round trips names and selects coordinates rather than ambiguous names", () => {
    const url = new URL(footprintPlaceUrl(places[1]), "https://example.com");
    expect(findLinkedPlace(places, url.search)).toEqual(places[1]);
  });
  it("ignores missing or invalid targets", () => {
    expect(findLinkedPlace(places, "")).toBeUndefined();
    expect(findLinkedPlace(places, "?place=%broken")).toBeUndefined();
    expect(findLinkedPlace([], "?place=anything")).toBeUndefined();
  });
});
