import { describe, expect, it } from "vitest";
import { getInitialMapView } from "./FootprintMap";

describe("getInitialMapView", () => {
  it("fits all places before loading the map layer", () => {
    expect(
      getInitialMapView([
        { lat: 30.25, lng: 120.15 },
        { lat: 35.67, lng: 139.65 },
      ])
    ).toEqual({
      bounds: [
        [30.25, 120.15],
        [35.67, 139.65],
      ],
      options: {
        padding: [48, 48],
        maxZoom: 12,
        animate: false,
      },
    });
  });

  it("uses the default world view when there are no places", () => {
    expect(getInitialMapView([])).toEqual({
      center: [25, 105],
      zoom: 3,
      options: { animate: false },
    });
  });
});
