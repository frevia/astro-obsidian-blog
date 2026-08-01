export type ProvinceFeatureCollection = {
  type: string;
  features: unknown[];
};

export type ProvinceDataMap = Record<string, ProvinceFeatureCollection>;

let provinceDataPromise: Promise<ProvinceDataMap> | undefined;

/**
 * Keep the CommonJS province bundle out of FootprintMap's entry chunk.
 * Geographic groups stay below Vite's large-chunk threshold and load in
 * parallel once the client:visible island actually hydrates.
 */
export function loadProvinceData(): Promise<ProvinceDataMap> {
  provinceDataPromise ??= Promise.all([
    import("./provinceDataGroups/north"),
    import("./provinceDataGroups/east"),
    import("./provinceDataGroups/centralSouth"),
    import("./provinceDataGroups/southwest"),
    import("./provinceDataGroups/northwest"),
  ]).then(groups => Object.assign({}, ...groups.map(group => group.default)));

  return provinceDataPromise;
}
