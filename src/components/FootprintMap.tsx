import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  LayerGroup,
  Map as LeafletMap,
  Marker as LeafletMarker,
} from "leaflet";
import type { Map as MapLibreMap, StyleSpecification } from "maplibre-gl";
import "leaflet/dist/leaflet.css";
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";
import "@/styles/footprint-leaflet.css";
import { prepareFootprintStyle } from "./footprint/vectorStyle";

export interface FootprintPlace {
  name: string;
  lng: number;
  lat: number;
}

export interface FootprintRecord {
  title: string;
  url: string;
  name: string;
  lng: number;
  lat: number;
  date?: string;
  thumbnail?: {
    src: string;
    alt: string;
  };
}

export interface FootprintMapProps {
  places?: FootprintPlace[];
  records?: FootprintRecord[];
}

type LeafletApi = typeof import("leaflet");
type MaplibreLayer = ReturnType<
  typeof import("@maplibre/maplibre-gl-leaflet").maplibreGL
>;

type PlaceItem = FootprintPlace & {
  key: string;
  posts: FootprintRecord[];
};

const MAP_PIN_PATH =
  "M16 2C9.373 2 4 7.373 4 14c0 8.68 9.65 18.4 11.35 20.03a.92.92 0 0 0 1.3 0C18.35 32.4 28 22.68 28 14 28 7.373 22.627 2 16 2Z";

function MapPinGlyph({ selected = false }: { selected?: boolean }) {
  return (
    <svg
      className={["footprint-map-legend-pin", selected ? "is-selected" : null]
        .filter(Boolean)
        .join(" ")}
      viewBox="0 0 32 42"
      aria-hidden="true"
      focusable="false"
    >
      <ellipse
        className="footprint-marker-pin-base"
        cx="16"
        cy="37"
        rx="9"
        ry="2.8"
      />
      <path className="footprint-marker-pin-body" d={MAP_PIN_PATH} />
      <circle className="footprint-marker-pin-hole" cx="16" cy="14" r="4.1" />
    </svg>
  );
}

const DEFAULT_CENTER: [number, number] = [25, 105];
const DEFAULT_ZOOM = 3;
const VECTOR_STYLE_URLS = {
  light: "https://tiles.openfreemap.org/styles/liberty",
  dark: "https://tiles.openfreemap.org/styles/dark",
} as const;
const VECTOR_ATTRIBUTION =
  '&copy; <a href="https://openfreemap.org/" target="_blank" rel="noreferrer">OpenFreeMap</a>, <a href="https://openmaptiles.org/" target="_blank" rel="noreferrer">OpenMapTiles</a>, <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors';
const RASTER_TILE_URL = import.meta.env.PUBLIC_FOOTPRINT_TILE_URL;
const RASTER_TILE_ATTRIBUTION =
  import.meta.env.PUBLIC_FOOTPRINT_TILE_ATTRIBUTION ??
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors';

type FootprintTheme = keyof typeof VECTOR_STYLE_URLS;

function currentFootprintTheme(): FootprintTheme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

async function fetchFootprintStyle(
  theme: FootprintTheme,
  signal: AbortSignal
): Promise<StyleSpecification> {
  const response = await fetch(VECTOR_STYLE_URLS[theme], { signal });
  if (!response.ok) {
    throw new Error(`OpenFreeMap style request failed: ${response.status}`);
  }

  const style = (await response.json()) as StyleSpecification;
  if (!Array.isArray(style.layers)) {
    throw new Error("OpenFreeMap style has no layers");
  }
  return prepareFootprintStyle(style, theme === "dark");
}

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

export function footprintPlaceKey(place: FootprintPlace): string {
  return `${place.name}:${place.lng},${place.lat}`;
}

function recordsAtPlace(
  place: FootprintPlace,
  records: FootprintRecord[]
): FootprintRecord[] {
  return records
    .filter(
      record =>
        Math.abs(record.lng - place.lng) < 1e-5 &&
        Math.abs(record.lat - place.lat) < 1e-5
    )
    .sort((a, b) => recordTime(b) - recordTime(a));
}

function recordTime(record?: FootprintRecord): number {
  if (!record?.date) return 0;
  const parsed = Date.parse(record.date);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDate(value?: string): string {
  if (!value) return "日期未记录";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "日期未记录"
    : dateFormatter.format(date);
}

function formatCoordinate(value: number): string {
  return value.toFixed(4);
}

function createMarkerIcon(L: LeafletApi, selected: boolean) {
  return L.divIcon({
    className: "footprint-marker-icon-wrap",
    html: `<span class="footprint-marker-icon${selected ? " is-selected" : ""}" aria-hidden="true"><svg viewBox="0 0 32 42" focusable="false"><ellipse class="footprint-marker-pin-base" cx="16" cy="37" rx="9" ry="2.8"></ellipse><path class="footprint-marker-pin-body" d="${MAP_PIN_PATH}"></path><circle class="footprint-marker-pin-hole" cx="16" cy="14" r="4.1"></circle></svg></span>`,
    iconSize: [38, 44],
    iconAnchor: [19, 42],
    popupAnchor: [0, -40],
  });
}

function createPopupContent(item: PlaceItem): HTMLElement {
  const root = document.createElement("div");
  root.className = "footprint-popup-content";

  const eyebrow = document.createElement("p");
  eyebrow.className = "footprint-popup-eyebrow";
  eyebrow.textContent = `${item.posts.length} 篇文章`;
  root.append(eyebrow);

  const title = document.createElement("h3");
  title.className = "footprint-popup-title";
  title.textContent = item.name;
  root.append(title);

  const coordinate = document.createElement("p");
  coordinate.className = "footprint-popup-coordinate";
  coordinate.textContent = `${formatCoordinate(item.lat)}, ${formatCoordinate(item.lng)}`;
  root.append(coordinate);

  if (item.posts.length > 0) {
    const list = document.createElement("ul");
    list.className = "footprint-popup-posts";
    item.posts.forEach(post => {
      const listItem = document.createElement("li");
      const link = document.createElement("a");
      link.href = post.url;
      link.dataset.astroPrefetch = "tap";

      if (post.thumbnail) {
        const image = document.createElement("img");
        image.className = "footprint-popup-post-image";
        image.src = post.thumbnail.src;
        image.alt = post.thumbnail.alt;
        image.width = 112;
        image.height = 70;
        image.loading = "lazy";
        image.decoding = "async";
        link.append(image);
      }

      const copy = document.createElement("span");
      copy.className = "footprint-popup-post-copy";

      const postTitle = document.createElement("span");
      postTitle.className = "footprint-popup-post-title";
      postTitle.textContent = post.title;
      copy.append(postTitle);

      const postDate = document.createElement("time");
      postDate.className = "footprint-popup-post-date";
      postDate.textContent = formatDate(post.date);
      if (post.date) postDate.dateTime = post.date;
      copy.append(postDate);

      link.append(copy);
      listItem.append(link);
      list.append(listItem);
    });
    root.append(list);
  }

  return root;
}

const FootprintMap: React.FC<FootprintMapProps> = ({
  places = [],
  records = [],
}) => {
  const mapElementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const leafletRef = useRef<LeafletApi | null>(null);
  const maplibreMapRef = useRef<MapLibreMap | null>(null);
  const markerLayerRef = useRef<LayerGroup<LeafletMarker> | null>(null);
  const markersRef = useRef(new Map<string, LeafletMarker>());

  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const placeItems = useMemo<PlaceItem[]>(
    () =>
      places
        .map(place => ({
          ...place,
          key: footprintPlaceKey(place),
          posts: recordsAtPlace(place, records),
        }))
        .sort((a, b) => {
          const latestA = recordTime(a.posts[0]);
          const latestB = recordTime(b.posts[0]);
          return latestB - latestA || a.name.localeCompare(b.name, "zh-CN");
        }),
    [places, records]
  );

  const articleCount = new Set(records.map(record => record.url)).size;
  const latestDate = records.reduce<string | undefined>((latest, record) => {
    if (!record.date) return latest;
    if (!latest || recordTime(record) > Date.parse(latest)) return record.date;
    return latest;
  }, undefined);

  const fitAllPlaces = useCallback(
    (animate = true) => {
      const map = mapRef.current;
      const L = leafletRef.current;
      if (!map || !L) return;

      if (placeItems.length === 0) {
        map.setView(DEFAULT_CENTER, DEFAULT_ZOOM, { animate });
        return;
      }

      const bounds = L.latLngBounds(
        placeItems.map(item => [item.lat, item.lng] as [number, number])
      );
      map.fitBounds(bounds, {
        padding: [48, 48],
        maxZoom: 12,
        animate,
      });
    },
    [placeItems]
  );

  const selectPlace = useCallback((key: string) => {
    setSelectedKey(key);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedKey(null);
    mapRef.current?.closePopup();
    fitAllPlaces();
  }, [fitAllPlaces]);

  useEffect(() => {
    const element = mapElementRef.current;
    if (!element) return;

    let cancelled = false;
    let resizeObserver: ResizeObserver | undefined;
    let themeObserver: MutationObserver | undefined;
    let invalidateTimer: number | undefined;
    let styleAbortController: AbortController | undefined;
    let styleRequestId = 0;
    let styleLoading = true;
    let activeTheme = currentFootprintTheme();
    let pendingTheme: FootprintTheme | null = null;
    let localMap: LeafletMap | null = null;
    let localVectorLayer: MaplibreLayer | null = null;

    const markStyleReady = () => {
      if (cancelled) return;
      styleLoading = false;
      pendingTheme = null;
      setMapReady(true);
      setMapError(null);
    };

    const applyVectorTheme = async (theme: FootprintTheme) => {
      const maplibreMap = maplibreMapRef.current;
      if (!maplibreMap || cancelled) return;

      const requestId = ++styleRequestId;
      styleAbortController?.abort();
      const controller = new AbortController();
      styleAbortController = controller;
      pendingTheme = theme;

      try {
        const style = await fetchFootprintStyle(theme, controller.signal);
        if (cancelled || requestId !== styleRequestId) return;

        styleLoading = true;
        maplibreMap.setStyle(style);
        activeTheme = theme;
        pendingTheme = null;
      } catch {
        if (
          cancelled ||
          controller.signal.aborted ||
          requestId !== styleRequestId
        ) {
          return;
        }
        pendingTheme = null;
        styleLoading = false;
        setMapError("地图暂时无法加载，但仍可从下方文章链接查看足迹。");
      }
    };

    const initializeMap = async () => {
      try {
        const module = (await import("leaflet")) as LeafletApi & {
          default?: LeafletApi;
        };
        if (cancelled) return;

        const L = module.default ?? module;
        let maplibreModule: typeof import("maplibre-gl") | undefined;
        let adapterModule:
          | typeof import("@maplibre/maplibre-gl-leaflet")
          | undefined;
        let initialStyle: StyleSpecification | undefined;

        if (!RASTER_TILE_URL) {
          styleAbortController = new AbortController();
          [maplibreModule, adapterModule, initialStyle] = await Promise.all([
            import("maplibre-gl"),
            import("@maplibre/maplibre-gl-leaflet"),
            fetchFootprintStyle(activeTheme, styleAbortController.signal),
          ]);
          if (cancelled) return;
          maplibreModule.setWorkerUrl(maplibreWorkerUrl);
        }

        const prefersReducedMotion = window.matchMedia(
          "(prefers-reduced-motion: reduce)"
        ).matches;
        const map = L.map(element, {
          zoomControl: false,
          minZoom: 1,
          maxBounds: [
            [-85, -Infinity],
            [85, Infinity],
          ],
          maxBoundsViscosity: 1,
          maxZoom: 18,
          scrollWheelZoom: false,
          zoomAnimation: !prefersReducedMotion,
          markerZoomAnimation: !prefersReducedMotion,
          attributionControl: false,
        });
        localMap = map;
        mapRef.current = map;
        leafletRef.current = L;
        map.setView(DEFAULT_CENTER, DEFAULT_ZOOM, { animate: false });

        L.control.zoom({ position: "topright" }).addTo(map);
        L.control.scale({ imperial: false, position: "bottomleft" }).addTo(map);
        const attributionControl = L.control.attribution({ prefix: false });
        attributionControl.addTo(map);
        if (RASTER_TILE_URL) {
          const tileLayer = L.tileLayer(RASTER_TILE_URL, {
            maxZoom: 19,
            attribution: RASTER_TILE_ATTRIBUTION,
            crossOrigin: true,
          });
          tileLayer.on("tileerror", () => {
            if (!cancelled) {
              setMapError("地图图层暂时不可用，但仍可从下方文章链接查看足迹。");
            }
          });
          tileLayer.addTo(map);
          attributionControl.addAttribution(RASTER_TILE_ATTRIBUTION);
          markStyleReady();
        } else if (adapterModule && initialStyle) {
          attributionControl.addAttribution(VECTOR_ATTRIBUTION);
          localVectorLayer = adapterModule.maplibreGL({
            style: initialStyle,
            localIdeographFontFamily: '"Noto Sans SC", system-ui, sans-serif',
            attributionControl: false,
          });
          localVectorLayer.addTo(map);
          const maplibreMap = localVectorLayer.getMaplibreMap();
          if (!maplibreMap)
            throw new Error("MapLibre layer did not initialize");

          maplibreMapRef.current = maplibreMap;
          maplibreMap.on("load", markStyleReady);
          maplibreMap.on("style.load", markStyleReady);
          maplibreMap.on("error", () => {
            if (!cancelled && styleLoading) {
              setMapError("地图暂时无法加载，但仍可从下方文章链接查看足迹。");
            }
          });
          if (maplibreMap.isStyleLoaded()) markStyleReady();

          themeObserver = new MutationObserver(() => {
            const theme = currentFootprintTheme();
            if (theme === activeTheme) {
              if (pendingTheme) {
                styleRequestId += 1;
                styleAbortController?.abort();
                pendingTheme = null;
              }
              styleLoading = false;
              setMapError(null);
              return;
            }
            void applyVectorTheme(theme);
          });
          themeObserver.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["data-theme"],
          });
          if (currentFootprintTheme() !== activeTheme) {
            void applyVectorTheme(currentFootprintTheme());
          }
        } else {
          throw new Error("MapLibre dependencies did not load");
        }

        markerLayerRef.current = L.layerGroup().addTo(map);
        resizeObserver = new ResizeObserver(() => {
          map.invalidateSize({ pan: false });
        });
        resizeObserver.observe(element);
        invalidateTimer = window.setTimeout(
          () => map.invalidateSize({ pan: false }),
          0
        );
      } catch (error) {
        if (!cancelled) {
          console.error("Footprint map initialization failed", error);
          styleLoading = false;
          setMapReady(false);
          setMapError("地图暂时无法加载，但仍可从下方文章链接查看足迹。");
        }
      }
    };

    void initializeMap();

    return () => {
      cancelled = true;
      styleRequestId += 1;
      styleAbortController?.abort();
      themeObserver?.disconnect();
      resizeObserver?.disconnect();
      if (invalidateTimer !== undefined) window.clearTimeout(invalidateTimer);
      markerLayerRef.current?.clearLayers();
      markerLayerRef.current = null;
      markersRef.current.clear();
      const map = localMap ?? mapRef.current;
      if (map && localVectorLayer) {
        try {
          if (map.hasLayer(localVectorLayer)) {
            map.removeLayer(localVectorLayer);
          } else {
            localVectorLayer.getMaplibreMap()?.remove();
          }
        } catch {
          try {
            localVectorLayer.getMaplibreMap()?.remove();
          } catch {
            // The layer may have failed before MapLibre created its map.
          }
        }
      }
      map?.remove();
      mapRef.current = null;
      leafletRef.current = null;
      maplibreMapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    const markerLayer = markerLayerRef.current;
    if (!map || !L || !markerLayer || !mapReady) return;

    markerLayer.clearLayers();
    markersRef.current.clear();

    placeItems.forEach(item => {
      const marker = L.marker([item.lat, item.lng], {
        icon: createMarkerIcon(L, item.key === selectedKey),
        title: item.name,
        keyboard: true,
        riseOnHover: true,
        autoPan: true,
      });
      marker.bindPopup(createPopupContent(item), {
        className: "footprint-leaflet-popup",
        maxWidth: 320,
        minWidth: 200,
        maxHeight: 240,
      });
      marker.on("click", () => selectPlace(item.key));
      marker.on("popupopen", () => selectPlace(item.key));
      marker.addTo(markerLayer);
      markersRef.current.set(item.key, marker);
    });
  }, [mapReady, placeItems, selectPlace]);

  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L || !mapReady) return;

    markersRef.current.forEach((marker, key) => {
      marker.setIcon(createMarkerIcon(L, key === selectedKey));
    });

    if (!selectedKey) return;
    const item = placeItems.find(place => place.key === selectedKey);
    const marker = markersRef.current.get(selectedKey);
    if (!item || !marker) return;

    const targetZoom = Math.max(map.getZoom(), 12);
    map.flyTo([item.lat, item.lng], targetZoom, {
      duration: 0.55,
      animate: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    });
    marker.openPopup();
  }, [mapReady, placeItems, selectedKey]);

  useEffect(() => {
    if (!mapReady) return;
    fitAllPlaces(false);
  }, [fitAllPlaces, mapReady]);

  const hasPlaces = placeItems.length > 0;

  return (
    <section
      className="footprint-explorer"
      aria-label="足迹地图与统计"
      data-footprint-explorer
    >
      <header className="footprint-overview">
        <dl className="footprint-stats">
          <div>
            <dt>地点</dt>
            <dd>{placeItems.length}</dd>
          </div>
          <div>
            <dt>文章</dt>
            <dd>{articleCount}</dd>
          </div>
          <div>
            <dt>最近记录</dt>
            <dd className="footprint-stat-date">{formatDate(latestDate)}</dd>
          </div>
        </dl>
      </header>

      {!hasPlaces ? (
        <section
          className="footprint-empty-state"
          aria-labelledby="footprint-empty-title"
          data-footprint-empty-state
        >
          <p className="footprint-eyebrow">还没有记录</p>
          <h2 id="footprint-empty-title">这里还没有地点</h2>
          <p>在文章里加上地点，这里就会显示相应标记。</p>
        </section>
      ) : null}

      <section
        className="footprint-map-panel"
        aria-labelledby="footprint-map-title"
      >
        <header className="footprint-map-panel-head">
          <div>
            <p className="footprint-eyebrow">TRAVEL JOURNAL</p>
            <h2 id="footprint-map-title">去过的地方</h2>
          </div>
          <div className="footprint-map-actions">
            <span
              className="footprint-map-status"
              role="status"
              aria-live="polite"
            >
              {mapError
                ? "地图暂不可用"
                : mapReady
                  ? "点击地点，展开回忆"
                  : "地图载入中"}
            </span>
            <button
              type="button"
              className="footprint-map-reset"
              onClick={clearSelection}
              disabled={!hasPlaces || !mapReady}
            >
              适配全部地点
            </button>
          </div>
        </header>

        <div className="footprint-map-legend" aria-label="地图图例">
          <span className="footprint-map-legend-item">
            <MapPinGlyph />
            已记录地点
          </span>
          <span className="footprint-map-legend-item">
            <MapPinGlyph selected />
            当前选中
          </span>
          <span className="footprint-map-legend-note">点标记查看文章</span>
        </div>

        <div className="footprint-map-body">
          <div className="footprint-map-frame">
            <div
              ref={mapElementRef}
              className="footprint-leaflet-map"
              role="region"
              aria-label="交互式足迹地图"
              aria-describedby="footprint-map-help"
            />
            {!mapReady && !mapError ? (
              <div
                className="footprint-map-loading app-loading-state"
                role="status"
              >
                正在准备地图图层…
              </div>
            ) : null}
            {mapError ? (
              <div className="footprint-map-error" role="status">
                {mapError}
              </div>
            ) : null}
          </div>
          <p className="footprint-map-help" id="footprint-map-help">
            拖动探索地图，点击地点查看照片与文章。键盘可用 Tab 选择标记，Enter
            打开。
          </p>
          {mapError ? (
            <ul className="footprint-fallback-links" aria-label="足迹文章">
              {Array.from(
                new Map(records.map(post => [post.url, post])).values()
              ).map(post => (
                <li key={post.url}>
                  <a href={post.url} data-astro-prefetch="tap">
                    {post.title}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>
    </section>
  );
};

export default FootprintMap;
