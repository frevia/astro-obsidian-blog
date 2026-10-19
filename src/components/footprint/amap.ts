export interface AMapMarker {
  readonly CLASS_NAME?: string;
}
export interface AMapInstance {
  on(event: string, callback: () => void): void;
  add(marker: AMapMarker): void;
  remove(markers: AMapMarker[]): void;
  getZoom(): number;
  panBy(x: number, y: number): void;
  setZoomAndCenter(zoom: number, center: [number, number]): void;
  lngLatToContainer(position: [number, number]): {
    getX(): number;
    getY(): number;
  };
  addControl(control: object): void;
  setFitView(
    markers: AMapMarker[],
    immediately: boolean,
    padding: number[],
    maxZoom: number
  ): void;
  setMapStyle(style: string): void;
  zoomIn(): void;
  zoomOut(): void;
  destroy(): void;
}
interface AMapAPI {
  Map: new (
    element: HTMLElement,
    options: Record<string, unknown>
  ) => AMapInstance;
  Marker: new (options: Record<string, unknown>) => AMapMarker;
  Pixel: new (x: number, y: number) => object;
  Scale: new () => object;
}
declare global {
  interface Window {
    AMap?: AMapAPI;
    _AMapSecurityConfig?: { serviceHost?: string; securityJsCode?: string };
    __footprintAMapReady?: () => void;
  }
}

let pending: Promise<AMapAPI> | undefined;

export function loadAMap(): Promise<AMapAPI> {
  if (window.AMap) return Promise.resolve(window.AMap);
  if (pending) return pending;
  const key = import.meta.env.PUBLIC_AMAP_KEY;
  const serviceHost = import.meta.env.PUBLIC_AMAP_SERVICE_HOST;
  const securityJsCode = import.meta.env.PUBLIC_AMAP_SECURITY_JS_CODE;
  if (!key || (!serviceHost && !securityJsCode)) {
    return Promise.reject(new Error("Missing AMap configuration"));
  }
  window._AMapSecurityConfig = serviceHost
    ? { serviceHost }
    : { securityJsCode };
  pending = new Promise<AMapAPI>((resolve, reject) => {
    const script = document.createElement("script");
    const cleanup = () => {
      clearTimeout(timer);
      delete window.__footprintAMapReady;
      script.onerror = null;
    };
    const fail = () => {
      cleanup();
      script.remove();
      reject(new Error("AMap failed to load"));
    };
    const timer = setTimeout(fail, 15000);
    window.__footprintAMapReady = () => {
      if (!window.AMap) {
        fail();
        return;
      }
      cleanup();
      resolve(window.AMap);
    };
    script.src = `https://webapi.amap.com/maps?${new URLSearchParams({
      v: "2.0",
      key,
      plugin: "AMap.Scale",
      callback: "__footprintAMapReady",
    })}`;
    script.async = true;
    script.onerror = fail;
    document.head.append(script);
  }).catch(error => {
    pending = undefined;
    throw error;
  });
  return pending;
}
