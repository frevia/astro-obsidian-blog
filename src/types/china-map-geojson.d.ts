declare module "china-map-geojson" {
  export type GeoFeature = {
    type: string;
    properties?: { name?: string };
    geometry?: unknown;
  };

  export const ChinaData: {
    type: string;
    features: GeoFeature[];
  };

  export const ProvinceData: Record<
    string,
    {
      type: string;
      features: GeoFeature[];
    }
  >;
}
