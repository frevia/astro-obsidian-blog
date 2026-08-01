import { describe, expect, it } from "vitest";
import { PROVINCE_NAME_MAP } from "./mapConstants";
import { loadProvinceData } from "./loadProvinceData";

describe("loadProvinceData", () => {
  it("loads every province collection and memoizes the request", async () => {
    const firstLoad = loadProvinceData();
    const data = await firstLoad;

    expect(loadProvinceData()).toBe(firstLoad);
    expect(Object.keys(data).sort()).toEqual(
      Object.keys(PROVINCE_NAME_MAP).sort()
    );
    for (const collection of Object.values(data)) {
      expect(collection.features.length).toBeGreaterThan(0);
    }
  });
});
