declare module "china-map-geojson/lib/china.js" {
  const data: {
    type: string;
    features: unknown[];
  };

  export default data;
}

declare module "china-map-geojson/lib/province/*.js" {
  const data: {
    type: string;
    features: unknown[];
  };

  export default data;
}
